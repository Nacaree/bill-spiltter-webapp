-- Apply only during the quiesced rollout documented in README/HANDOFF.
-- Stop old confirmation callbacks before changing retention; this file does not purge records.
begin;

-- UTC calendar arithmetic makes the deadline independent of connection time zones.
alter table public.bills add column last_activity_at timestamptz not null default now();
update public.bills b set last_activity_at = greatest(b.created_at,
  coalesce((select max(a.created_at) from public.activity_log a where a.bill_id=b.id), b.created_at),
  coalesce((select max(s.created_at) from public.receipt_scans s where s.bill_id=b.id), b.created_at));
update public.bills set expires_at = ((last_activity_at at time zone 'UTC') + interval '12 months') at time zone 'UTC'
  where archived_at is null and (expires_at is null or expires_at > statement_timestamp());
create index bills_lifecycle_expiry on public.bills(expires_at);

create function public.touch_bill_activity(target_bill_id uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare deadline timestamptz; archived timestamptz; touched timestamptz;
begin
  select expires_at, archived_at into deadline, archived from bills where id=target_bill_id for update;
  if not found or archived is not null or deadline <= clock_timestamp() then
    raise exception 'Bill is no longer available' using errcode='P0002';
  end if;
  touched := clock_timestamp();
  update bills set last_activity_at=touched,
    expires_at=((touched at time zone 'UTC')+interval '12 months') at time zone 'UTC'
    where id=target_bill_id;
end;
$$;
create function public.record_bill_activity() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if new.action like 'participant.%' or new.action like 'expense.%'
    or new.action like 'settlement.%' or new.action like 'payment_method.%' then
    perform touch_bill_activity(new.bill_id);
  end if;
  return new;
end;
$$;
create trigger activity_log_touch_bill after insert on public.activity_log
  for each row execute function public.record_bill_activity();

-- Backstop direct server writes too; background updates never extend a deadline.
create function public.guard_receipt_lifecycle() returns trigger
language plpgsql security invoker set search_path=public as $$
declare deadline timestamptz; archived timestamptz;
begin
  select expires_at,archived_at into deadline,archived from bills where id=new.bill_id for update;
  if not found or archived is not null or deadline<=clock_timestamp() then
    raise exception 'Bill is no longer available' using errcode='P0002';
  end if;
  if tg_op='INSERT' then
    perform touch_bill_activity(new.bill_id);
  elsif old.status<>'confirmed' and (old.status='expired' or old.expires_at<=clock_timestamp()) then
    raise exception 'Receipt has expired' using errcode='P0004';
  end if;
  return new;
end;
$$;
create trigger receipt_scans_lifecycle before insert or update on public.receipt_scans
  for each row execute function public.guard_receipt_lifecycle();

create function public.guard_upload_lifecycle() returns trigger
language plpgsql security invoker set search_path=public as $$
declare deadline timestamptz; archived timestamptz;
begin
  select expires_at,archived_at into deadline,archived from bills where id=new.bill_id for update;
  if not found or archived is not null or deadline<=clock_timestamp() then
    raise exception 'Bill is no longer available' using errcode='P0002';
  end if;
  new.expires_at:=least(new.expires_at,deadline);
  return new;
end;
$$;
create trigger image_upload_reservations_lifecycle before insert or update on public.image_upload_reservations
  for each row execute function public.guard_upload_lifecycle();

-- No FK to bills: these jobs must survive the row deletion they describe.
-- A prefix job sweeps all bill files; an object job sweeps a draft's immutable key.
create table public.lifecycle_file_jobs (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null,
  bucket text not null check(bucket in ('receipt-images','payment-qrs','image-upload-staging')),
  object_key text,
  created_at timestamptz not null default clock_timestamp(),
  final_sweep_after timestamptz not null default clock_timestamp()+interval '24 hours',
  next_attempt_at timestamptz not null default clock_timestamp(),
  lease_id uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  check(object_key is null or (object_key like bill_id::text||'/%' and object_key not like '%..%'))
);
create index lifecycle_file_jobs_due on public.lifecycle_file_jobs(next_attempt_at);
alter table public.lifecycle_file_jobs enable row level security;
revoke all on public.lifecycle_file_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.lifecycle_file_jobs to service_role;

create function public.purge_bill_records(target_bill_id uuid) returns void
language plpgsql security invoker set search_path=public as $$
begin
  perform 1 from bills where id=target_bill_id for update;
  if not found then return; end if;
  insert into lifecycle_file_jobs(bill_id,bucket)
    select target_bill_id,unnest(array['receipt-images','payment-qrs','image-upload-staging']);
  delete from rate_limit_counters where
    (policy in ('people_bill','upload_bill','upload_bill_day','complete_bill','write_bill','extract_bill') and subject=target_bill_id::text)
    or (policy in ('upload_actor','complete_actor','write_actor','extract_actor') and subject in
      (select id::text from bill_participants where bill_id=target_bill_id));
  -- Explicit dependency order also covers NO ACTION foreign keys between children.
  delete from image_upload_reservations where bill_id=target_bill_id;
  delete from expense_shares where bill_id=target_bill_id;
  delete from expenses where bill_id=target_bill_id;
  delete from receipt_scans where bill_id=target_bill_id;
  delete from settlements where bill_id=target_bill_id;
  delete from bill_payment_methods where bill_id=target_bill_id;
  delete from activity_log where bill_id=target_bill_id;
  delete from bill_participants where bill_id=target_bill_id;
  delete from bills where id=target_bill_id;
end;
$$;

create function public.delete_bill_permanently(share_hash text,recovery_hash text,
  actor_participant_id uuid,actor_session_hash text) returns uuid
language plpgsql security invoker set search_path=public as $$
declare target uuid;
begin
  select b.id into target from bills b where b.public_id_hash=share_hash for update;
  if target is null then return null; end if;
  if not exists(select 1 from bills b join bill_participants p on p.bill_id=b.id
    where b.id=target and b.creator_key_hash=recovery_hash and b.archived_at is null
      and (b.expires_at is null or b.expires_at>clock_timestamp())
      and p.id=actor_participant_id and p.session_token_hash=actor_session_hash
      and p.is_creator and p.deactivated_at is null) then
    raise exception 'Creator access required' using errcode='P0003';
  end if;
  perform purge_bill_records(target);
  return target;
end;
$$;

create function public.cleanup_bill_lifecycle(batch_size integer default 20) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare b record; s record; bills_removed integer:=0; drafts_removed integer:=0;
begin
  if batch_size<1 or batch_size>20 then raise exception 'Batch must be between 1 and 20'; end if;
  for b in select id from bills where expires_at<=clock_timestamp()
    order by expires_at,id limit batch_size for update skip locked loop
    perform purge_bill_records(b.id); bills_removed:=bills_removed+1;
  end loop;
  -- Parent first, matching application/worker lock order. SKIP LOCKED permits retries.
  for b in select id from bills where exists(select 1 from receipt_scans candidate where candidate.bill_id=bills.id
      and candidate.status<>'confirmed' and candidate.expires_at<=clock_timestamp())
      order by id limit batch_size for update skip locked loop
    for s in select id,storage_key from receipt_scans where bill_id=b.id
      and status<>'confirmed' and expires_at<=clock_timestamp()
      order by expires_at,id limit (batch_size-drafts_removed) for update skip locked loop
      insert into lifecycle_file_jobs(bill_id,bucket,object_key)
        select b.id,unnest(array['receipt-images','image-upload-staging']),s.storage_key;
      delete from image_upload_reservations where receipt_scan_id=s.id;
      delete from receipt_scans where id=s.id;
      drafts_removed:=drafts_removed+1;
    end loop;
    exit when drafts_removed>=batch_size;
  end loop;
  return jsonb_build_object('bills_removed',bills_removed,'drafts_removed',drafts_removed);
end;
$$;

create function public.claim_lifecycle_file_jobs(batch_size integer default 3,target_bill_id uuid default null)
returns setof public.lifecycle_file_jobs
language sql security invoker set search_path=public as $$
  update lifecycle_file_jobs j set lease_id=gen_random_uuid(),lease_until=clock_timestamp()+interval '5 minutes',attempts=attempts+1
  where j.id in(select id from lifecycle_file_jobs where next_attempt_at<=clock_timestamp()
    and (lease_until is null or lease_until<=clock_timestamp())
    and (target_bill_id is null or bill_id=target_bill_id)
    order by next_attempt_at,id limit greatest(1,least(batch_size,3)) for update skip locked)
  returning j.*;
$$;
create function public.finish_lifecycle_file_job(target_job_id uuid,target_lease_id uuid,succeeded boolean,drained boolean)
returns void language plpgsql security invoker set search_path=public as $$
declare job lifecycle_file_jobs%rowtype;
begin
  select * into job from lifecycle_file_jobs where id=target_job_id and lease_id=target_lease_id for update;
  if not found then return; end if;
  if succeeded and drained and job.final_sweep_after<=clock_timestamp() then
    delete from lifecycle_file_jobs where id=job.id;
  else
    update lifecycle_file_jobs set lease_id=null,lease_until=null,
      next_attempt_at=case when succeeded and drained then job.final_sweep_after
        when succeeded then clock_timestamp() else clock_timestamp()+interval '5 minutes' end
      where id=job.id;
  end if;
end;
$$;

-- Recheck parent/draft lifetimes under the same lock as deletion.
create or replace function public.store_receipt_extraction_v2(
  target_scan_id uuid,
  expected_attempt_id uuid,
  extracted_merchant_name text,
  extracted_receipt_date date,
  extracted_currency char(3),
  extracted_subtotal_minor bigint,
  extracted_tax_minor bigint,
  extracted_tip_minor bigint,
  extracted_discount_minor bigint,
  extracted_total_minor bigint,
  extraction_provider text,
  extraction_provider_request_id text,
  extracted_items jsonb
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform 1 from bills b where b.id=(select s.bill_id from receipt_scans s where s.id=target_scan_id)
    and b.archived_at is null and (b.expires_at is null or b.expires_at>clock_timestamp()) for update;
  if not found then return false; end if;
  if not exists (
    select 1 from receipt_scans scan
    where scan.id = target_scan_id and scan.status = 'processing' and scan.expires_at>clock_timestamp()
      and scan.extraction_attempt_id = expected_attempt_id
    for update
  ) then
    return false;
  end if;

  delete from receipt_items item where item.receipt_scan_id = target_scan_id;

  insert into receipt_items (
    receipt_scan_id, position, description, quantity, unit_price_minor,
    total_minor, confidence_basis_points, needs_review
  )
  select
    target_scan_id,
    item.position,
    trim(item.description),
    coalesce(item.quantity, 1),
    item.unit_price_minor,
    item.total_minor,
    item.confidence_basis_points,
    item.needs_review
  from jsonb_to_recordset(coalesce(extracted_items, '[]'::jsonb))
    as item(
      position integer,
      description text,
      quantity numeric,
      unit_price_minor bigint,
      total_minor bigint,
      confidence_basis_points integer,
      needs_review boolean
    );

  update receipt_scans scan set
    status = 'needs_review',
    merchant_name = nullif(trim(extracted_merchant_name), ''),
    receipt_date = extracted_receipt_date,
    currency = upper(extracted_currency),
    subtotal_minor = extracted_subtotal_minor,
    tax_minor = extracted_tax_minor,
    tip_minor = extracted_tip_minor,
    discount_minor = extracted_discount_minor,
    total_minor = extracted_total_minor,
    provider = extraction_provider,
    provider_request_id = extraction_provider_request_id,
    error_code = null
  where scan.id = target_scan_id;
  return true;
end;
$$;

create or replace function public.fail_receipt_extraction_v2(target_scan_id uuid, expected_attempt_id uuid, failure_code text)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from bills b where b.id=(select s.bill_id from receipt_scans s where s.id=target_scan_id)
    and b.archived_at is null and (b.expires_at is null or b.expires_at>clock_timestamp()) for update;
  if not found then return false; end if;
  update receipt_scans set status = 'failed', error_code = failure_code
  where id = target_scan_id and expires_at>clock_timestamp() and status = 'processing' and extraction_attempt_id = expected_attempt_id;
  return found;
end;
$$;

create or replace function public.claim_receipt_extraction_v3(target_scan_id uuid, actor_participant_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare scan receipt_scans%rowtype; actor uuid; quota jsonb; attempt uuid;
begin
  perform 1 from bills b where b.id=(select s.bill_id from receipt_scans s where s.id=target_scan_id)
    and b.archived_at is null and (b.expires_at is null or b.expires_at>clock_timestamp()) for update;
  if not found then return jsonb_build_object('claimed',false); end if;
  select s.* into scan from receipt_scans s join bills b on b.id=s.bill_id
    where s.id=target_scan_id and s.expires_at>clock_timestamp() and b.archived_at is null
      and (b.expires_at is null or b.expires_at>clock_timestamp()) for update of s;
  if scan.id is null then return jsonb_build_object('claimed',false); end if;
  actor := coalesce(actor_participant_id, scan.uploaded_by_participant_id);
  if not exists (select 1 from bill_participants p where p.id=actor and p.bill_id=scan.bill_id and p.deactivated_at is null) then
    raise exception 'Participant session required' using errcode='P0001';
  end if;
  if not (scan.status in ('uploaded','failed') or (scan.status='processing' and
    coalesce(scan.processing_started_at,scan.updated_at)<=clock_timestamp()-interval '150 seconds')) then
    return jsonb_build_object('claimed',false);
  end if;
  if scan.next_retry_at > clock_timestamp() then
    return jsonb_build_object('claimed',false,'rate_limited',true,'retry_after_seconds',
      greatest(1,ceil(extract(epoch from scan.next_retry_at-clock_timestamp()))::integer));
  end if;
  quota := consume_rate_limits(jsonb_build_array(
    jsonb_build_object('policy','extract_actor','subject',actor::text),
    jsonb_build_object('policy','extract_bill','subject',scan.bill_id::text),
    jsonb_build_object('policy','extract_app','subject','app')));
  if not (quota->>'allowed')::boolean then
    update receipt_scans set status='failed',error_code='app_rate_limited',
      next_retry_at=clock_timestamp()+make_interval(secs=>(quota->>'retry_after_seconds')::integer)
      where id=scan.id;
    return quota || jsonb_build_object('claimed',false,'rate_limited',true);
  end if;
  attempt := gen_random_uuid();
  update receipt_scans set status='processing',error_code=null,next_retry_at=null,
    attempt_count=attempt_count+1,extraction_attempt_id=attempt,processing_started_at=clock_timestamp()
    where id=scan.id;
  return jsonb_build_object('claimed',true,'scan_id',scan.id,'storage_key',scan.storage_key,
    'mime_type',scan.mime_type,'bill_currency',scan.currency,'attempt_id',attempt);
end;
$$;

create or replace function public.confirm_receipt_expense(
  share_hash text,
  actor_participant_id uuid,
  actor_session_hash text,
  target_scan_id uuid,
  confirmation_key uuid,
  expense_description text,
  paid_by_participant_id uuid,
  expense_category text,
  expense_date date,
  receipt_merchant_name text,
  receipt_subtotal_minor bigint,
  receipt_tax_minor bigint,
  receipt_tip_minor bigint,
  receipt_discount_minor bigint,
  receipt_total_minor bigint,
  chosen_adjustment_method public.receipt_adjustment_method,
  item_rows jsonb,
  assignment_rows jsonb,
  share_rows jsonb
) returns table (expense_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  scan_total bigint;
  scan_status public.receipt_scan_status;
  scan_confirmation_key uuid;
  existing_expense_id uuid;
  new_expense_id uuid;
  new_item_id uuid;
  current_item record;
  supplied_share_count integer;
  valid_share_count integer;
  supplied_share_total bigint;
begin
  select b.id into found_bill_id
  from bills b
  join bill_participants actor
    on actor.bill_id = b.id
   and actor.id = actor_participant_id
   and actor.session_token_hash = actor_session_hash
   and actor.deactivated_at is null
  where b.public_id_hash = share_hash
    and b.archived_at is null
    and (b.expires_at is null or b.expires_at > clock_timestamp())
  for update of b, actor;

  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'A current participant session is required' using errcode = 'P0001';
  end if;

  select scan.total_minor, scan.status, scan.confirmation_key
  into scan_total, scan_status, scan_confirmation_key
  from receipt_scans scan
  where scan.id = target_scan_id
    and scan.bill_id = found_bill_id
    and (scan.status='confirmed' or scan.expires_at>clock_timestamp())
  for update;

  if scan_status = 'confirmed' and scan_confirmation_key = confirmation_key then
    select expense.id into existing_expense_id
    from expenses expense
    where expense.receipt_scan_id = target_scan_id;
    return query select existing_expense_id;
    return;
  end if;

  if scan_status is distinct from 'needs_review' then
    raise exception 'Receipt is not ready to confirm' using errcode = 'P0004';
  end if;

  if receipt_total_minor is null or receipt_total_minor <= 0 then
    raise exception 'Receipt total must be positive' using errcode = 'P0004';
  end if;
  scan_total := receipt_total_minor;

  if not exists (
    select 1 from bill_participants payer
    where payer.bill_id = found_bill_id
      and payer.id = paid_by_participant_id
      and payer.deactivated_at is null
  ) then
    raise exception 'Payer is not active on this bill' using errcode = 'P0004';
  end if;

  if jsonb_typeof(item_rows) <> 'array'
     or jsonb_array_length(item_rows) = 0
     or jsonb_typeof(assignment_rows) <> 'array'
     or jsonb_array_length(assignment_rows) = 0
     or jsonb_typeof(share_rows) <> 'array'
     or jsonb_array_length(share_rows) = 0 then
    raise exception 'Receipt allocations are incomplete' using errcode = 'P0004';
  end if;

  select
    count(*),
    count(*) filter (
      where participant.id is not null and parsed.amount_minor >= 0
    ),
    coalesce(sum(parsed.amount_minor), 0)
  into supplied_share_count, valid_share_count, supplied_share_total
  from jsonb_to_recordset(share_rows)
    as parsed(participant_id uuid, amount_minor bigint)
  left join bill_participants participant
    on participant.bill_id = found_bill_id
   and participant.id = parsed.participant_id
   and participant.deactivated_at is null;

  if supplied_share_count <> valid_share_count
     or supplied_share_total <> scan_total
     or supplied_share_count <> (
       select count(distinct parsed.participant_id)
       from jsonb_to_recordset(share_rows)
         as parsed(participant_id uuid, amount_minor bigint)
     ) then
    raise exception 'Final receipt shares do not match the total' using errcode = 'P0004';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(item_rows)
      as item(client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
    where item.client_key is null
      or char_length(trim(item.description)) not between 1 and 160
      or item.total_minor < 0
      or item.position < 0
      or (item.quantity is not null and (item.quantity <= 0 or item.quantity > 1000 or item.quantity <> round(item.quantity, 3)))
      or item.unit_price_minor < 0
  ) or (
    select count(*) from jsonb_to_recordset(item_rows)
      as item(client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
  ) <> (
    select count(distinct item.client_key) from jsonb_to_recordset(item_rows)
      as item(client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
  ) then
    raise exception 'Receipt items are invalid' using errcode = 'P0004';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(item_rows)
      as item(client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
    where (
      select coalesce(sum(assignment.amount_minor), 0)
      from jsonb_to_recordset(assignment_rows)
        as assignment(client_key text, participant_id uuid, amount_minor bigint)
      join bill_participants participant
        on participant.id = assignment.participant_id
       and participant.bill_id = found_bill_id
       and participant.deactivated_at is null
      where assignment.client_key = item.client_key
    ) <> item.total_minor
  ) or exists (
    select 1
    from jsonb_to_recordset(assignment_rows)
      as assignment(client_key text, participant_id uuid, amount_minor bigint)
    left join bill_participants participant
      on participant.id = assignment.participant_id
     and participant.bill_id = found_bill_id
     and participant.deactivated_at is null
    where participant.id is null or assignment.amount_minor < 0
  ) then
    raise exception 'Receipt item assignments are invalid' using errcode = 'P0004';
  end if;

  delete from receipt_items item where item.receipt_scan_id = target_scan_id;

  for current_item in
    select *
    from jsonb_to_recordset(item_rows)
      as item(client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
    order by item.position
  loop
    insert into receipt_items (
      receipt_scan_id, position, description, quantity, unit_price_minor, total_minor,
      confidence_basis_points, needs_review
    ) values (
      target_scan_id, current_item.position, trim(current_item.description),
      coalesce(current_item.quantity, 1), current_item.unit_price_minor, current_item.total_minor, current_item.confidence_basis_points,
      current_item.needs_review
    ) returning id into new_item_id;

    insert into receipt_item_assignments (
      receipt_item_id, participant_id, amount_minor
    )
    select new_item_id, assignment.participant_id, assignment.amount_minor
    from jsonb_to_recordset(assignment_rows)
      as assignment(client_key text, participant_id uuid, amount_minor bigint)
    where assignment.client_key = current_item.client_key;
  end loop;

  insert into expenses (
    bill_id, description, amount_minor, paid_by_participant_id, split_method,
    category, expense_date, receipt_scan_id, created_by_participant_id,
    updated_by_participant_id
  ) values (
    found_bill_id, trim(expense_description), scan_total,
    paid_by_participant_id, 'exact', expense_category, expense_date,
    target_scan_id, actor_participant_id, actor_participant_id
  ) returning id into new_expense_id;

  insert into expense_shares (bill_id, expense_id, participant_id, amount_minor)
  select found_bill_id, new_expense_id, parsed.participant_id, parsed.amount_minor
  from jsonb_to_recordset(share_rows)
    as parsed(participant_id uuid, amount_minor bigint);

  update receipt_scans scan set
    status = 'confirmed',
    merchant_name = nullif(trim(receipt_merchant_name), ''),
    receipt_date = expense_date,
    subtotal_minor = receipt_subtotal_minor,
    tax_minor = receipt_tax_minor,
    tip_minor = receipt_tip_minor,
    discount_minor = receipt_discount_minor,
    total_minor = receipt_total_minor,
    adjustment_method = chosen_adjustment_method,
    confirmation_key = confirm_receipt_expense.confirmation_key,
    confirmed_at = clock_timestamp(),
    expires_at = clock_timestamp()
  where scan.id = target_scan_id;

  insert into activity_log (
    bill_id, actor_participant_id, entity_type, entity_id, action, metadata
  ) values (
    found_bill_id, actor_participant_id, 'expense', new_expense_id,
    'expense.receipt_confirmed',
    jsonb_build_object(
      'description', trim(expense_description),
      'amount_minor', scan_total,
      'receipt_scan_id', target_scan_id
    )
  );

  return query select new_expense_id;
end;
$$;

create or replace function public.get_image_upload(
  target_upload_id uuid, actor_participant_id uuid, actor_session_hash text,
  recovery_hash text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  upload_row image_upload_reservations%rowtype;
  currency_code text;
begin
  perform 1 from bills b where b.id=(select r.bill_id from image_upload_reservations r where r.id=target_upload_id)
    and b.archived_at is null and (b.expires_at is null or b.expires_at>clock_timestamp()) for update;
  if not found then raise exception 'Upload is unavailable' using errcode='P0001'; end if;
  select r.* into upload_row
  from image_upload_reservations r
  join bills b on b.id = r.bill_id and b.public_id_hash = r.share_hash
  join bill_participants actor on actor.bill_id = b.id and actor.id = r.participant_id
  where r.id = target_upload_id and actor.id = actor_participant_id
    and actor.session_token_hash = actor_session_hash and actor.deactivated_at is null
    and b.archived_at is null and (b.expires_at is null or b.expires_at > clock_timestamp())
    and (r.purpose = 'receipt' or (actor.is_creator and b.creator_key_hash = recovery_hash))
  for update of r, b, actor;
  if upload_row.id is null then
    raise exception 'This upload is unavailable for this participant session' using errcode = 'P0001';
  end if;
  if upload_row.expires_at <= clock_timestamp() or upload_row.status = 'rejected' then
    raise exception 'This upload expired or was rejected. Choose the image again.' using errcode = 'P0004';
  end if;
  select b.currency into currency_code from bills b where b.id = upload_row.bill_id;
  return to_jsonb(upload_row) || jsonb_build_object('bill_currency', currency_code);
end;
$$;

create or replace function public.create_bill_with_creator(
  bill_name text,
  bill_currency char(3),
  share_hash text,
  recovery_hash text,
  creator_name text,
  participant_session_hash text,
  bill_expires_at timestamptz default (((now() at time zone 'UTC') + interval '12 months') at time zone 'UTC')
) returns table (bill_id uuid, participant_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_bill_id uuid;
  new_participant_id uuid;
begin
  insert into bills (name, currency, public_id_hash, creator_key_hash, expires_at)
  values (trim(bill_name), upper(bill_currency), share_hash, recovery_hash, bill_expires_at)
  returning id into new_bill_id;

  insert into bill_participants (bill_id, display_name, session_token_hash, is_creator)
  values (new_bill_id, trim(creator_name), participant_session_hash, true)
  returning id into new_participant_id;

  insert into activity_log (bill_id, actor_participant_id, entity_type, entity_id, action, metadata)
  values (new_bill_id, new_participant_id, 'bill', new_bill_id, 'bill.created', jsonb_build_object('name', trim(bill_name)));

  return query select new_bill_id, new_participant_id;
end;
$$;

create or replace function public.join_bill(
  share_hash text,
  participant_name text,
  participant_session_hash text
) returns table (bill_id uuid, participant_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  new_participant_id uuid;
begin
  select id into found_bill_id
  from bills
  where public_id_hash = share_hash
    and archived_at is null
    and (expires_at is null or expires_at > clock_timestamp())
  for update;

  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'Bill not found or no longer active' using errcode = 'P0002';
  end if;

  insert into bill_participants (bill_id, display_name, session_token_hash)
  values (found_bill_id, trim(participant_name), participant_session_hash)
  returning id into new_participant_id;

  insert into activity_log (bill_id, actor_participant_id, entity_type, entity_id, action, metadata)
  values (
    found_bill_id,
    new_participant_id,
    'participant',
    new_participant_id,
    'participant.joined',
    jsonb_build_object('display_name', trim(participant_name))
  );

  return query select found_bill_id, new_participant_id;
end;
$$;

create or replace function public.add_bill_participant(
  share_hash text,
  actor_participant_id uuid,
  actor_session_hash text,
  participant_name text
) returns table (participant_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  new_participant_id uuid;
begin
  select b.id into found_bill_id
  from bills b
  join bill_participants actor
    on actor.bill_id = b.id
   and actor.id = actor_participant_id
   and actor.session_token_hash = actor_session_hash
   and actor.deactivated_at is null
  where b.public_id_hash = share_hash
    and b.archived_at is null
    and (b.expires_at is null or b.expires_at > clock_timestamp())
  for update of b, actor;

  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'A current participant session is required' using errcode = 'P0001';
  end if;

  insert into bill_participants (bill_id, display_name)
  values (found_bill_id, trim(participant_name))
  returning id into new_participant_id;

  insert into activity_log (
    bill_id,
    actor_participant_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    found_bill_id,
    actor_participant_id,
    'participant',
    new_participant_id,
    'participant.added',
    jsonb_build_object('display_name', trim(participant_name))
  );

  return query select new_participant_id;
end;
$$;

create or replace function public.claim_bill_participant(
  share_hash text,
  target_participant_id uuid,
  participant_session_hash text
) returns table (bill_id uuid, participant_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  found_participant_id uuid;
begin
  select b.id, participant.id
  into found_bill_id, found_participant_id
  from bills b
  join bill_participants participant on participant.bill_id = b.id
  where b.public_id_hash = share_hash
    and b.archived_at is null
    and (b.expires_at is null or b.expires_at > clock_timestamp())
    and participant.id = target_participant_id
    and participant.session_token_hash is null
    and participant.deactivated_at is null
  for update of participant;

  if found_participant_id is null then
    raise exception 'Participant is unavailable' using errcode = 'P0003';
  end if;

  update bill_participants
  set session_token_hash = participant_session_hash
  where id = found_participant_id;

  insert into activity_log (
    bill_id,
    actor_participant_id,
    entity_type,
    entity_id,
    action
  ) values (
    found_bill_id,
    found_participant_id,
    'participant',
    found_participant_id,
    'participant.claimed'
  );

  return query select found_bill_id, found_participant_id;
end;
$$;

create or replace function public.create_manual_expense(
  share_hash text,
  actor_participant_id uuid,
  actor_session_hash text,
  expense_description text,
  expense_amount_minor bigint,
  paid_by_participant_id uuid,
  expense_split_method public.expense_split_method,
  expense_category text,
  expense_date date,
  expense_notes text,
  share_rows jsonb
) returns table (expense_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  new_expense_id uuid;
  supplied_share_count integer;
  valid_share_count integer;
  supplied_share_total bigint;
begin
  select b.id into found_bill_id
  from bills b
  join bill_participants actor
    on actor.bill_id = b.id
   and actor.id = actor_participant_id
   and actor.session_token_hash = actor_session_hash
   and actor.deactivated_at is null
  where b.public_id_hash = share_hash
    and b.archived_at is null
    and (b.expires_at is null or b.expires_at > clock_timestamp())
  for update of b, actor;

  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'A current participant session is required' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from bill_participants payer
    where payer.bill_id = found_bill_id
      and payer.id = paid_by_participant_id
      and payer.deactivated_at is null
  ) then
    raise exception 'Payer is not active on this bill' using errcode = 'P0004';
  end if;

  if jsonb_typeof(share_rows) <> 'array'
     or jsonb_array_length(share_rows) = 0 then
    raise exception 'At least one expense share is required' using errcode = 'P0004';
  end if;

  select
    count(*),
    count(*) filter (
      where participant.id is not null
        and parsed.amount_minor >= 0
    ),
    coalesce(sum(parsed.amount_minor), 0)
  into supplied_share_count, valid_share_count, supplied_share_total
  from jsonb_to_recordset(share_rows)
    as parsed(participant_id uuid, amount_minor bigint)
  left join bill_participants participant
    on participant.bill_id = found_bill_id
   and participant.id = parsed.participant_id
   and participant.deactivated_at is null;

  if supplied_share_count <> valid_share_count
     or supplied_share_total <> expense_amount_minor
     or supplied_share_count <> (
       select count(distinct parsed.participant_id)
       from jsonb_to_recordset(share_rows)
         as parsed(participant_id uuid, amount_minor bigint)
     ) then
    raise exception 'Expense shares are invalid or do not match the total' using errcode = 'P0004';
  end if;

  insert into expenses (
    bill_id,
    description,
    amount_minor,
    paid_by_participant_id,
    split_method,
    category,
    expense_date,
    notes,
    created_by_participant_id,
    updated_by_participant_id
  ) values (
    found_bill_id,
    trim(expense_description),
    expense_amount_minor,
    paid_by_participant_id,
    expense_split_method,
    expense_category,
    expense_date,
    nullif(trim(expense_notes), ''),
    actor_participant_id,
    actor_participant_id
  ) returning id into new_expense_id;

  insert into expense_shares (
    bill_id,
    expense_id,
    participant_id,
    amount_minor
  )
  select
    found_bill_id,
    new_expense_id,
    parsed.participant_id,
    parsed.amount_minor
  from jsonb_to_recordset(share_rows)
    as parsed(participant_id uuid, amount_minor bigint);

  insert into activity_log (
    bill_id,
    actor_participant_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    found_bill_id,
    actor_participant_id,
    'expense',
    new_expense_id,
    'expense.created',
    jsonb_build_object(
      'description', trim(expense_description),
      'amount_minor', expense_amount_minor
    )
  );

  return query select new_expense_id;
end;
$$;

create or replace function public.update_manual_expense(
  share_hash text,
  actor_participant_id uuid,
  actor_session_hash text,
  target_expense_id uuid,
  expense_description text,
  expense_amount_minor bigint,
  new_paid_by_participant_id uuid,
  expense_split_method public.expense_split_method,
  expense_category text,
  new_expense_date date,
  expense_notes text,
  share_rows jsonb
) returns table (expense_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  old_description text;
  old_amount_minor bigint;
  supplied_share_count integer;
  valid_share_count integer;
  supplied_share_total bigint;
begin
  select b.id into found_bill_id
  from bills b
  join bill_participants actor
    on actor.bill_id = b.id
   and actor.id = actor_participant_id
   and actor.session_token_hash = actor_session_hash
   and actor.deactivated_at is null
  where b.public_id_hash = share_hash
    and b.archived_at is null
    and (b.expires_at is null or b.expires_at > clock_timestamp())
  for update of b, actor;

  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'A current participant session is required' using errcode = 'P0001';
  end if;

  select description, amount_minor
  into old_description, old_amount_minor
  from expenses
  where id = target_expense_id
    and bill_id = found_bill_id
    and deleted_at is null
  for update;

  if old_description is null then
    raise exception 'Expense is not available on this bill' using errcode = 'P0004';
  end if;

  if not exists (
    select 1 from bill_participants payer
    where payer.bill_id = found_bill_id
      and payer.id = new_paid_by_participant_id
      and payer.deactivated_at is null
  ) then
    raise exception 'Payer is not active on this bill' using errcode = 'P0004';
  end if;

  if jsonb_typeof(share_rows) <> 'array'
     or jsonb_array_length(share_rows) = 0 then
    raise exception 'At least one expense share is required' using errcode = 'P0004';
  end if;

  select
    count(*),
    count(*) filter (
      where participant.id is not null
        and parsed.amount_minor >= 0
    ),
    coalesce(sum(parsed.amount_minor), 0)
  into supplied_share_count, valid_share_count, supplied_share_total
  from jsonb_to_recordset(share_rows)
    as parsed(participant_id uuid, amount_minor bigint)
  left join bill_participants participant
    on participant.bill_id = found_bill_id
   and participant.id = parsed.participant_id
   and participant.deactivated_at is null;

  if supplied_share_count <> valid_share_count
     or supplied_share_total <> expense_amount_minor
     or supplied_share_count <> (
       select count(distinct parsed.participant_id)
       from jsonb_to_recordset(share_rows)
         as parsed(participant_id uuid, amount_minor bigint)
     ) then
    raise exception 'Expense shares are invalid or do not match the total' using errcode = 'P0004';
  end if;

  update expenses set
    description = trim(expense_description),
    amount_minor = expense_amount_minor,
    paid_by_participant_id = new_paid_by_participant_id,
    split_method = expense_split_method,
    category = expense_category,
    expense_date = new_expense_date,
    notes = nullif(trim(expense_notes), ''),
    updated_by_participant_id = actor_participant_id
  where id = target_expense_id;

  delete from expense_shares as old_share
  where old_share.expense_id = target_expense_id;

  insert into expense_shares (
    bill_id,
    expense_id,
    participant_id,
    amount_minor
  )
  select
    found_bill_id,
    target_expense_id,
    parsed.participant_id,
    parsed.amount_minor
  from jsonb_to_recordset(share_rows)
    as parsed(participant_id uuid, amount_minor bigint);

  insert into activity_log (
    bill_id,
    actor_participant_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    found_bill_id,
    actor_participant_id,
    'expense',
    target_expense_id,
    'expense.updated',
    jsonb_build_object(
      'old_description', old_description,
      'old_amount_minor', old_amount_minor,
      'description', trim(expense_description),
      'amount_minor', expense_amount_minor
    )
  );

  return query select target_expense_id;
end;
$$;

create or replace function public.remove_manual_expense(
  share_hash text,
  actor_participant_id uuid,
  actor_session_hash text,
  target_expense_id uuid
) returns table (expense_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  removed_description text;
  removed_amount_minor bigint;
begin
  select b.id into found_bill_id
  from bills b
  join bill_participants actor
    on actor.bill_id = b.id
   and actor.id = actor_participant_id
   and actor.session_token_hash = actor_session_hash
   and actor.deactivated_at is null
  where b.public_id_hash = share_hash
    and b.archived_at is null
    and (b.expires_at is null or b.expires_at > clock_timestamp())
  for update of b, actor;

  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'A current participant session is required' using errcode = 'P0001';
  end if;

  select description, amount_minor
  into removed_description, removed_amount_minor
  from expenses
  where id = target_expense_id
    and bill_id = found_bill_id
    and deleted_at is null
  for update;

  if removed_description is null then
    raise exception 'Expense is not available on this bill' using errcode = 'P0004';
  end if;

  update expenses set
    deleted_at = clock_timestamp(),
    updated_by_participant_id = actor_participant_id
  where id = target_expense_id;

  insert into activity_log (
    bill_id,
    actor_participant_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    found_bill_id,
    actor_participant_id,
    'expense',
    target_expense_id,
    'expense.removed',
    jsonb_build_object(
      'description', removed_description,
      'amount_minor', removed_amount_minor
    )
  );

  return query select target_expense_id;
end;
$$;

create or replace function public.get_bill_ledger(share_hash text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'participants', coalesce((select jsonb_agg(jsonb_build_object('id', p.id,
      'display_name', p.display_name, 'is_creator', p.is_creator,
      'deactivated_at', p.deactivated_at) order by p.created_at, p.id)
      from bill_participants p where p.bill_id = b.id), '[]'::jsonb),
    'expenses', coalesce((select jsonb_agg(jsonb_build_object('id', e.id,
      'description', e.description, 'paid_by_participant_id', e.paid_by_participant_id,
      'amount_minor', e.amount_minor::text,
      'shares', coalesce((select jsonb_agg(jsonb_build_object('participantId', s.participant_id,
        'amountMinor', s.amount_minor::text)) from expense_shares s where s.expense_id = e.id), '[]'::jsonb)))
      from expenses e where e.bill_id = b.id and e.deleted_at is null), '[]'::jsonb),
    'settlements', coalesce((select jsonb_agg(jsonb_build_object('id', s.id,
      'from_participant_id', s.from_participant_id, 'to_participant_id', s.to_participant_id,
      'amount_minor', s.amount_minor::text, 'settled_at', s.settled_at, 'notes', s.notes,
      'created_by_participant_id', s.created_by_participant_id, 'updated_at', s.updated_at)
      order by s.settled_at desc, s.created_at desc) from settlements s
      where s.bill_id = b.id and s.deleted_at is null), '[]'::jsonb)
  ) from bills b where b.public_id_hash = share_hash and b.archived_at is null
    and (b.expires_at is null or b.expires_at > clock_timestamp());
$$;

create or replace function public.save_bill_settlement(
  share_hash text, actor_participant_id uuid, actor_session_hash text,
  target_settlement_id uuid, operation text,
  sender_id uuid default null, recipient_id uuid default null,
  payment_amount_minor bigint default null, payment_date date default null,
  payment_notes text default '', expected_updated_at timestamptz default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  found_bill_id uuid;
  old_row settlements%rowtype;
begin
  select b.id into found_bill_id from bills b
  join bill_participants actor on actor.bill_id = b.id
    and actor.id = actor_participant_id and actor.session_token_hash = actor_session_hash
    and actor.deactivated_at is null
  where b.public_id_hash = share_hash and b.archived_at is null
    and (b.expires_at is null or b.expires_at > clock_timestamp())
  for update of b, actor;
  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'Join this bill before recording payments' using errcode = 'P0001';
  end if;
  if operation is null or operation not in ('create', 'update', 'remove') then
    raise exception 'Invalid payment operation' using errcode = 'P0004';
  end if;
  select * into old_row from settlements s where s.id = target_settlement_id for update;
  if operation = 'create' and old_row.id is not null then
    -- Only an identical retry by the original actor is idempotent.
    if old_row.bill_id = found_bill_id and old_row.deleted_at is null
      and old_row.created_by_participant_id = actor_participant_id
      and old_row.from_participant_id = sender_id and old_row.to_participant_id = recipient_id
      and old_row.amount_minor = payment_amount_minor
      and old_row.settled_at = (payment_date::timestamp at time zone 'UTC')
      and coalesce(old_row.notes, '') = coalesce(trim(payment_notes), '') then
      return old_row.id;
    end if;
    raise exception 'Payment was already recorded or changed; refresh' using errcode = 'P0004';
  elsif operation <> 'create' then
    if old_row.id is null or old_row.bill_id <> found_bill_id or old_row.deleted_at is not null
      or expected_updated_at is null or old_row.updated_at <> expected_updated_at then
      raise exception 'Payment changed; refresh before editing' using errcode = 'P0004';
    end if;
  end if;
  if operation <> 'remove' then
    if sender_id is null or recipient_id is null or sender_id = recipient_id
      or payment_amount_minor is null or payment_amount_minor not between 1 and 9007199254740991
      or payment_date is null or char_length(payment_notes) > 1000
      or (select count(*) from bill_participants p where p.bill_id = found_bill_id
        and p.id in (sender_id, recipient_id)) <> 2 then
      raise exception 'Check payment amount and participants' using errcode = 'P0004';
    end if;
  end if;
  if operation = 'create' then
    insert into settlements(id, bill_id, from_participant_id, to_participant_id,
      amount_minor, settled_at, notes, created_by_participant_id, updated_by_participant_id)
    values (target_settlement_id, found_bill_id, sender_id, recipient_id,
      payment_amount_minor, payment_date::timestamp at time zone 'UTC',
      nullif(trim(payment_notes), ''), actor_participant_id, actor_participant_id);
  elsif operation = 'update' then
    update settlements set from_participant_id = sender_id, to_participant_id = recipient_id,
      amount_minor = payment_amount_minor, settled_at = payment_date::timestamp at time zone 'UTC',
      notes = nullif(trim(payment_notes), ''), updated_by_participant_id = actor_participant_id,
      updated_at = clock_timestamp() where id = target_settlement_id;
  else
    update settlements set deleted_at = clock_timestamp(), updated_at = clock_timestamp(),
      updated_by_participant_id = actor_participant_id where id = target_settlement_id;
  end if;
  insert into activity_log(bill_id, actor_participant_id, entity_type, entity_id, action, metadata)
  values (found_bill_id, actor_participant_id, 'settlement', target_settlement_id,
    'settlement.' || case operation when 'create' then 'created' when 'update' then 'updated' else 'removed' end,
    jsonb_build_object('from_participant_id', coalesce(sender_id, old_row.from_participant_id),
      'to_participant_id', coalesce(recipient_id, old_row.to_participant_id),
      'amount_minor', coalesce(payment_amount_minor, old_row.amount_minor),
      'previous_amount_minor', old_row.amount_minor,
      'previous_from_participant_id', old_row.from_participant_id,
      'previous_to_participant_id', old_row.to_participant_id,
      'previous_settled_at', old_row.settled_at));
  return target_settlement_id;
end;
$$;

create or replace function public.save_bill_payment_method(
  share_hash text, recovery_hash text, actor_participant_id uuid, actor_session_hash text,
  operation text, expected_method_id uuid default null, expected_updated_at timestamptz default null,
  storage_key text default null, recipient text default null, qr_currency text default null,
  payload_hash text default null, fixed_amount bigint default null, qr_expires_at timestamptz default null
) returns text
language plpgsql security invoker set search_path = public as $$
declare
  found_bill_id uuid;
  found_currency text;
  old_row bill_payment_methods%rowtype;
begin
  select b.id, b.currency into found_bill_id, found_currency from bills b
  join bill_participants actor on actor.bill_id = b.id and actor.id = actor_participant_id
    and actor.is_creator and actor.deactivated_at is null and actor.session_token_hash = actor_session_hash
  where b.public_id_hash = share_hash and b.creator_key_hash = recovery_hash
    and b.archived_at is null and (b.expires_at is null or b.expires_at > clock_timestamp())
  for update of b, actor;
  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'Creator session and recovery key required' using errcode = 'P0003';
  end if;
  select * into old_row from bill_payment_methods m where m.bill_id = found_bill_id for update;
  if old_row.id is distinct from expected_method_id or
    (old_row.id is not null and old_row.updated_at is distinct from expected_updated_at) then
    raise exception 'Payment QR changed; refresh' using errcode = 'P0004';
  end if;
  if operation = 'remove' then
    if old_row.id is null then return null; end if;
    delete from bill_payment_methods where bill_id = found_bill_id;
  elsif operation = 'save' then
    if qr_currency is distinct from found_currency or storage_key is null
      or storage_key not like found_bill_id::text || '/%'
      or recipient is null or payload_hash is null
      or (qr_expires_at is not null and qr_expires_at <= clock_timestamp()) then
      raise exception 'Invalid QR details' using errcode = 'P0004';
    end if;
    if old_row.qr_payload_hash = payload_hash then
      raise exception 'This QR is already configured' using errcode = 'P0004';
    end if;
    insert into bill_payment_methods(bill_id, owner_participant_id, qr_storage_key,
      recipient_label, supported_currencies, qr_payload_hash, fixed_amount_minor, expires_at)
    values (found_bill_id, actor_participant_id, storage_key, trim(recipient),
      array[qr_currency], payload_hash, fixed_amount, qr_expires_at)
    on conflict (bill_id) do update set qr_storage_key = excluded.qr_storage_key,
      recipient_label = excluded.recipient_label, supported_currencies = excluded.supported_currencies,
      qr_payload_hash = excluded.qr_payload_hash, fixed_amount_minor = excluded.fixed_amount_minor,
      expires_at = excluded.expires_at, updated_at = clock_timestamp();
  else
    raise exception 'Invalid QR operation' using errcode = 'P0004';
  end if;
  insert into activity_log(bill_id, actor_participant_id, entity_type, entity_id, action)
  values (found_bill_id, actor_participant_id, 'payment_method', found_bill_id,
    'payment_method.' || case when operation = 'remove' then 'removed'
      when old_row.id is null then 'created' else 'updated' end);
  return old_row.qr_storage_key;
end;
$$;

create or replace function public.save_bill_payment_method_v2(
  share_hash text, recovery_hash text, actor_participant_id uuid, actor_session_hash text,
  operation text, expected_method_id uuid default null, expected_updated_at timestamptz default null,
  storage_key text default null, recipient text default null, qr_currency text default null,
  payload_hash text default null, fixed_amount bigint default null, qr_expires_at timestamptz default null,
  qr_currencies text[] default null
) returns text
language plpgsql security invoker set search_path = public as $$
declare
  found_bill_id uuid;
  found_currency text;
  old_row bill_payment_methods%rowtype;
  accepted_currencies text[];
begin
  select b.id, b.currency into found_bill_id, found_currency from bills b
  join bill_participants actor on actor.bill_id = b.id and actor.id = actor_participant_id
    and actor.is_creator and actor.deactivated_at is null and actor.session_token_hash = actor_session_hash
  where b.public_id_hash = share_hash and b.creator_key_hash = recovery_hash
    and b.archived_at is null and (b.expires_at is null or b.expires_at > clock_timestamp())
  for update of b, actor;
  if found_bill_id is null or not exists(select 1 from bills where id=found_bill_id and archived_at is null and (expires_at is null or expires_at>clock_timestamp())) then
    raise exception 'Creator session and recovery key required' using errcode = 'P0003';
  end if;
  select * into old_row from bill_payment_methods m where m.bill_id = found_bill_id for update;
  if old_row.id is distinct from expected_method_id or
    (old_row.id is not null and old_row.updated_at is distinct from expected_updated_at) then
    raise exception 'Payment QR changed; refresh' using errcode = 'P0004';
  end if;
  if operation = 'remove' then
    if old_row.id is null then return null; end if;
    delete from bill_payment_methods where bill_id = found_bill_id;
  elsif operation = 'save' then
    accepted_currencies := coalesce(qr_currencies, array[qr_currency]);
    if cardinality(accepted_currencies) not between 1 and 2
      or array_ndims(accepted_currencies) <> 1
      or array_position(accepted_currencies, null) is not null
      or not (accepted_currencies <@ array['KHR','USD']::text[])
      or (select count(distinct c) from unnest(accepted_currencies) as c) <> cardinality(accepted_currencies)
      or not (found_currency = any(accepted_currencies))
      or qr_currency is null or not (qr_currency = any(accepted_currencies))
      or (fixed_amount is not null and cardinality(accepted_currencies) <> 1) then
      raise exception 'Check the QR currencies; fixed amounts require one currency' using errcode = 'P0004';
    end if;
    select array_agg(c order by c) into accepted_currencies from unnest(accepted_currencies) as c;
    if storage_key is null
      or storage_key not like found_bill_id::text || '/%'
      or recipient is null or payload_hash is null
      or (qr_expires_at is not null and qr_expires_at <= clock_timestamp()) then
      raise exception 'Invalid QR details' using errcode = 'P0004';
    end if;
    if old_row.qr_payload_hash = payload_hash and old_row.supported_currencies = accepted_currencies then
      raise exception 'This QR is already configured' using errcode = 'P0004';
    end if;
    insert into bill_payment_methods(bill_id, owner_participant_id, qr_storage_key,
      recipient_label, supported_currencies, qr_payload_hash, fixed_amount_minor, expires_at)
    values (found_bill_id, actor_participant_id, storage_key, trim(recipient),
      accepted_currencies, payload_hash, fixed_amount, qr_expires_at)
    on conflict (bill_id) do update set qr_storage_key = excluded.qr_storage_key,
      recipient_label = excluded.recipient_label, supported_currencies = excluded.supported_currencies,
      qr_payload_hash = excluded.qr_payload_hash, fixed_amount_minor = excluded.fixed_amount_minor,
      expires_at = excluded.expires_at, updated_at = clock_timestamp();
  else
    raise exception 'Invalid QR operation' using errcode = 'P0004';
  end if;
  insert into activity_log(bill_id, actor_participant_id, entity_type, entity_id, action)
  values (found_bill_id, actor_participant_id, 'payment_method', found_bill_id,
    'payment_method.' || case when operation = 'remove' then 'removed'
      when old_row.id is null then 'created' else 'updated' end);
  return old_row.qr_storage_key;
end;
$$;

-- All entry points and trigger helpers remain server-only.
revoke execute on function public.touch_bill_activity(uuid),public.record_bill_activity(),
  public.guard_receipt_lifecycle(),public.guard_upload_lifecycle(),public.purge_bill_records(uuid),
  public.delete_bill_permanently(text,text,uuid,text),public.cleanup_bill_lifecycle(integer),
  public.claim_lifecycle_file_jobs(integer,uuid),public.finish_lifecycle_file_job(uuid,uuid,boolean,boolean)
  from public,anon,authenticated;
grant execute on function public.touch_bill_activity(uuid),public.record_bill_activity(),
  public.guard_receipt_lifecycle(),public.guard_upload_lifecycle(),public.purge_bill_records(uuid),
  public.delete_bill_permanently(text,text,uuid,text),public.cleanup_bill_lifecycle(integer),
  public.claim_lifecycle_file_jobs(integer,uuid),public.finish_lifecycle_file_job(uuid,uuid,boolean,boolean)
  to service_role;
commit;
