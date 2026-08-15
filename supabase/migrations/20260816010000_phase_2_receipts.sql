create type public.receipt_scan_status as enum (
  'uploaded',
  'processing',
  'needs_review',
  'failed',
  'confirmed',
  'expired'
);

create type public.receipt_adjustment_method as enum (
  'proportional',
  'equal',
  'custom'
);

create table public.receipt_scans (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  uploaded_by_participant_id uuid not null,
  status public.receipt_scan_status not null default 'uploaded',
  storage_key text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/heic', 'image/heif')),
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  merchant_name text check (merchant_name is null or char_length(merchant_name) <= 120),
  receipt_date date,
  currency char(3) not null,
  subtotal_minor bigint check (subtotal_minor is null or subtotal_minor >= 0),
  tax_minor bigint check (tax_minor is null or tax_minor >= 0),
  tip_minor bigint check (tip_minor is null or tip_minor >= 0),
  discount_minor bigint check (discount_minor is null or discount_minor >= 0),
  total_minor bigint check (total_minor is null or total_minor > 0),
  adjustment_method public.receipt_adjustment_method not null default 'proportional',
  provider text,
  provider_request_id text,
  error_code text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  confirmation_key uuid unique,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, bill_id),
  foreign key (bill_id, uploaded_by_participant_id)
    references public.bill_participants(bill_id, id)
);

create index receipt_scans_bill_created
  on public.receipt_scans (bill_id, created_at desc);

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_scan_id uuid not null references public.receipt_scans(id) on delete cascade,
  position integer not null check (position >= 0),
  description text not null check (char_length(trim(description)) between 1 and 160),
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit_price_minor bigint,
  total_minor bigint not null check (total_minor > 0),
  confidence_basis_points integer check (
    confidence_basis_points is null
    or confidence_basis_points between 0 and 10000
  ),
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receipt_scan_id, position)
);

create table public.receipt_item_assignments (
  id uuid primary key default gen_random_uuid(),
  receipt_item_id uuid not null references public.receipt_items(id) on delete cascade,
  participant_id uuid not null references public.bill_participants(id),
  weight integer not null default 1 check (weight > 0),
  amount_minor bigint not null check (amount_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receipt_item_id, participant_id)
);

alter table public.expenses
  add constraint expenses_receipt_scan_id_fk
    foreign key (receipt_scan_id) references public.receipt_scans(id),
  add constraint expenses_receipt_scan_id_unique unique (receipt_scan_id);

create trigger receipt_scans_set_updated_at
before update on public.receipt_scans
for each row execute function public.set_updated_at();

create trigger receipt_items_set_updated_at
before update on public.receipt_items
for each row execute function public.set_updated_at();

create trigger receipt_item_assignments_set_updated_at
before update on public.receipt_item_assignments
for each row execute function public.set_updated_at();

create or replace function public.claim_receipt_extraction(target_scan_id uuid)
returns table (
  scan_id uuid,
  storage_key text,
  mime_type text,
  bill_currency char(3)
)
language sql
security invoker
set search_path = public
as $$
  update receipt_scans scan set
    status = 'processing',
    error_code = null,
    attempt_count = scan.attempt_count + 1
  where scan.id = target_scan_id
    and scan.status in ('uploaded', 'failed')
    and scan.expires_at > now()
  returning scan.id, scan.storage_key, scan.mime_type, scan.currency;
$$;

create or replace function public.store_receipt_extraction(
  target_scan_id uuid,
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
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from receipt_scans scan
    where scan.id = target_scan_id and scan.status = 'processing'
    for update
  ) then
    raise exception 'Receipt is not processing' using errcode = 'P0004';
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
    and (b.expires_at is null or b.expires_at > now())
  for update of b, actor;

  if found_bill_id is null then
    raise exception 'A current participant session is required' using errcode = 'P0001';
  end if;

  select scan.total_minor, scan.status, scan.confirmation_key
  into scan_total, scan_status, scan_confirmation_key
  from receipt_scans scan
  where scan.id = target_scan_id
    and scan.bill_id = found_bill_id
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
              confidence_basis_points integer, needs_review boolean)
    where item.client_key is null
      or char_length(trim(item.description)) not between 1 and 160
      or item.total_minor < 0
      or item.position < 0
  ) or (
    select count(*) from jsonb_to_recordset(item_rows)
      as item(client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean)
  ) <> (
    select count(distinct item.client_key) from jsonb_to_recordset(item_rows)
      as item(client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean)
  ) then
    raise exception 'Receipt items are invalid' using errcode = 'P0004';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(item_rows)
      as item(client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean)
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
              confidence_basis_points integer, needs_review boolean)
    order by item.position
  loop
    insert into receipt_items (
      receipt_scan_id, position, description, total_minor,
      confidence_basis_points, needs_review
    ) values (
      target_scan_id, current_item.position, trim(current_item.description),
      current_item.total_minor, current_item.confidence_basis_points,
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
    confirmed_at = now(),
    expires_at = now()
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

alter table public.receipt_scans enable row level security;
alter table public.receipt_items enable row level security;
alter table public.receipt_item_assignments enable row level security;

revoke all on public.receipt_scans, public.receipt_items,
  public.receipt_item_assignments from anon, authenticated;
revoke execute on function public.claim_receipt_extraction(uuid)
  from public, anon, authenticated;
revoke execute on function public.store_receipt_extraction(
  uuid, text, date, char, bigint, bigint, bigint, bigint, bigint,
  text, text, jsonb
) from public, anon, authenticated;
revoke execute on function public.confirm_receipt_expense(
  text, uuid, text, uuid, uuid, text, uuid, text, date,
  text, bigint, bigint, bigint, bigint, bigint,
  public.receipt_adjustment_method, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant select, insert, update, delete on public.receipt_scans,
  public.receipt_items, public.receipt_item_assignments to service_role;
grant execute on function public.claim_receipt_extraction(uuid)
  to service_role;
grant execute on function public.store_receipt_extraction(
  uuid, text, date, char, bigint, bigint, bigint, bigint, bigint,
  text, text, jsonb
) to service_role;
grant execute on function public.confirm_receipt_expense(
  text, uuid, text, uuid, uuid, text, uuid, text, date,
  text, bigint, bigint, bigint, bigint, bigint,
  public.receipt_adjustment_method, jsonb, jsonb, jsonb
) to service_role;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'receipt-images',
  'receipt-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
) on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
