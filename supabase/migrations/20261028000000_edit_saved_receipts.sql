begin;

-- Ensure optimistic versions advance even for writes within one clock tick.
create function public.touch_receipt_expense_version() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.receipt_scan_id is not null then
    new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  end if;
  return new;
end;
$$;
revoke all on function public.touch_receipt_expense_version() from public, anon, authenticated;
create trigger expenses_z_receipt_edit_version before update on public.expenses
for each row execute function public.touch_receipt_expense_version();

-- Update the same confirmed expense atomically; never recreate a deleted one.
create or replace function public.update_receipt_expense(
  share_hash text,
  actor_participant_id uuid,
  actor_session_hash text,
  target_scan_id uuid,
  target_expense_id uuid,
  expected_updated_at timestamptz,
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
) returns table (expense_id uuid, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  stored_expense expenses%rowtype;
  scan_total bigint;
  scan_status public.receipt_scan_status;
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

  select scan.total_minor, scan.status
  into scan_total, scan_status
  from receipt_scans scan
  where scan.id = target_scan_id
    and scan.bill_id = found_bill_id
    and (scan.status='confirmed' or scan.expires_at>clock_timestamp())
  for update;

  if scan_status is distinct from 'confirmed' then
    raise exception 'Receipt is not confirmed' using errcode = 'P0004';
  end if;
  select expense.* into stored_expense from expenses expense
  where expense.id = target_expense_id and expense.bill_id = found_bill_id
    and expense.receipt_scan_id = target_scan_id and expense.deleted_at is null
  for update;
  if stored_expense.id is null then
    raise exception 'Receipt expense is unavailable' using errcode = 'P0004';
  end if;
  if expected_updated_at is null or stored_expense.updated_at <> expected_updated_at then
    raise exception 'Receipt changed since it was opened' using errcode = 'P0005';
  end if;

  if receipt_total_minor is null or receipt_total_minor <= 0 then
    raise exception 'Receipt total must be positive' using errcode = 'P0004';
  end if;
  scan_total := receipt_total_minor;

  if not exists (
    select 1 from bill_participants payer
    where payer.bill_id = found_bill_id
      and payer.id = paid_by_participant_id
      and (payer.deactivated_at is null or payer.id = stored_expense.paid_by_participant_id)
  ) then
    raise exception 'Payer is not active on this bill' using errcode = 'P0004';
  end if;

  if jsonb_typeof(item_rows) is distinct from 'array'
     or jsonb_array_length(item_rows) not between 1 and 250
     or jsonb_typeof(assignment_rows) is distinct from 'array'
     or jsonb_array_length(assignment_rows) = 0
     or jsonb_typeof(share_rows) is distinct from 'array'
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
   and (participant.deactivated_at is null or exists (
     select 1 from expense_shares old_share where old_share.expense_id=target_expense_id and old_share.participant_id=participant.id
   ));

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
      as item(saved_item_id uuid, client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
    where item.client_key is null or item.description is null
      or char_length(trim(item.description)) not between 1 and 160
      or item.total_minor is null or item.total_minor <= 0 or item.total_minor > 9007199254740991
      or item.position is null or item.position < 0
      or (item.quantity is not null and (item.quantity <= 0 or item.quantity > 1000 or item.quantity <> round(item.quantity, 3)))
      or item.unit_price_minor < 0
  ) or (
    select count(*) from jsonb_to_recordset(item_rows)
      as item(saved_item_id uuid, client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
  ) <> (
    select count(distinct item.client_key) from jsonb_to_recordset(item_rows)
      as item(saved_item_id uuid, client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
  ) then
    raise exception 'Receipt items are invalid' using errcode = 'P0004';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(item_rows)
      as item(saved_item_id uuid, client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
    where (
      select coalesce(sum(assignment.amount_minor), 0)
      from jsonb_to_recordset(assignment_rows)
        as assignment(client_key text, participant_id uuid, amount_minor bigint)
      join bill_participants participant
        on participant.id = assignment.participant_id
       and participant.bill_id = found_bill_id
       and (participant.deactivated_at is null or exists (
         select 1 from jsonb_to_recordset(item_rows) as supplied(client_key text, saved_item_id uuid)
         join receipt_items old_item on old_item.id=supplied.saved_item_id and old_item.receipt_scan_id=target_scan_id
         join receipt_item_assignments old_assignment on old_assignment.receipt_item_id=old_item.id
         where supplied.client_key=assignment.client_key and old_assignment.participant_id=participant.id and old_assignment.amount_minor=assignment.amount_minor
       ))
      where assignment.client_key = item.client_key
    ) <> item.total_minor
  ) or exists (
    select 1
    from jsonb_to_recordset(assignment_rows)
      as assignment(client_key text, participant_id uuid, amount_minor bigint)
    left join bill_participants participant
      on participant.id = assignment.participant_id
     and participant.bill_id = found_bill_id
     and (participant.deactivated_at is null or exists (
         select 1 from jsonb_to_recordset(item_rows) as supplied(client_key text, saved_item_id uuid)
         join receipt_items old_item on old_item.id=supplied.saved_item_id and old_item.receipt_scan_id=target_scan_id
         join receipt_item_assignments old_assignment on old_assignment.receipt_item_id=old_item.id
         where supplied.client_key=assignment.client_key and old_assignment.participant_id=participant.id and old_assignment.amount_minor=assignment.amount_minor
       ))
    where participant.id is null or assignment.amount_minor < 0
  ) then
    raise exception 'Receipt item assignments are invalid' using errcode = 'P0004';
  end if;

  -- Reject foreign/repeated original item IDs, orphan assignments and duplicate pairs.
  if exists (
    select 1 from jsonb_to_recordset(item_rows) as item(saved_item_id uuid)
    where item.saved_item_id is not null and not exists (
      select 1 from receipt_items old_item where old_item.id=item.saved_item_id and old_item.receipt_scan_id=target_scan_id
    )
  ) or exists (
    select 1 from jsonb_to_recordset(item_rows) as item(saved_item_id uuid)
    where item.saved_item_id is not null group by item.saved_item_id having count(*)>1
  ) or exists (
    select 1 from jsonb_to_recordset(assignment_rows) as assignment(client_key text, participant_id uuid, amount_minor bigint)
    where assignment.amount_minor is null or assignment.amount_minor<0 or not exists (
      select 1 from jsonb_to_recordset(item_rows) as item(client_key text) where item.client_key=assignment.client_key
    )
  ) or exists (
    select 1 from jsonb_to_recordset(assignment_rows) as assignment(client_key text, participant_id uuid)
    group by assignment.client_key, assignment.participant_id having count(*)>1
  ) or exists (
    select 1 from jsonb_to_recordset(share_rows) as share(participant_id uuid)
    where not exists (select 1 from jsonb_to_recordset(assignment_rows) as assignment(participant_id uuid) where assignment.participant_id=share.participant_id)
  ) or exists (
    select 1 from jsonb_to_recordset(assignment_rows) as assignment(participant_id uuid)
    where not exists (select 1 from jsonb_to_recordset(share_rows) as share(participant_id uuid) where share.participant_id=assignment.participant_id)
  ) then
    raise exception 'Receipt allocations are invalid' using errcode = 'P0004';
  end if;

  delete from receipt_items item where item.receipt_scan_id = target_scan_id;

  for current_item in
    select *
    from jsonb_to_recordset(item_rows)
      as item(saved_item_id uuid, client_key text, description text, total_minor bigint, position integer,
              confidence_basis_points integer, needs_review boolean, quantity numeric, unit_price_minor bigint)
    order by item.position
  loop
    insert into receipt_items (
      id, receipt_scan_id, position, description, quantity, unit_price_minor, total_minor,
      confidence_basis_points, needs_review
    ) values (
      coalesce(current_item.saved_item_id, gen_random_uuid()), target_scan_id, current_item.position, trim(current_item.description),
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

  update expenses expense set
    description=trim(expense_description), amount_minor=scan_total,
    paid_by_participant_id=update_receipt_expense.paid_by_participant_id,
    split_method='exact', category=expense_category, expense_date=update_receipt_expense.expense_date,
    updated_by_participant_id=actor_participant_id
  where expense.id=target_expense_id;
  new_expense_id := target_expense_id;
  delete from expense_shares old_share where old_share.expense_id=target_expense_id;

  insert into expense_shares (bill_id, expense_id, participant_id, amount_minor)
  select found_bill_id, new_expense_id, parsed.participant_id, parsed.amount_minor
  from jsonb_to_recordset(share_rows)
    as parsed(participant_id uuid, amount_minor bigint);

  update receipt_scans scan set
    merchant_name = nullif(trim(receipt_merchant_name), ''),
    receipt_date = expense_date,
    subtotal_minor = receipt_subtotal_minor,
    tax_minor = receipt_tax_minor,
    tip_minor = receipt_tip_minor,
    discount_minor = receipt_discount_minor,
    total_minor = receipt_total_minor,
    adjustment_method = chosen_adjustment_method,
    updated_at = clock_timestamp()
  where scan.id = target_scan_id;

  insert into activity_log (
    bill_id, actor_participant_id, entity_type, entity_id, action, metadata
  ) values (
    found_bill_id, actor_participant_id, 'expense', new_expense_id,
    'expense.receipt_updated',
    jsonb_build_object(
      'description', trim(expense_description),
      'amount_minor', scan_total,
      'receipt_scan_id', target_scan_id
    )
  );

  return query select expense.id, expense.updated_at from expenses expense where expense.id=target_expense_id;
end;
$$;

revoke execute on function public.update_receipt_expense(text, uuid, text, uuid, uuid, timestamptz, text, uuid, text, date, text, bigint, bigint, bigint, bigint, bigint, public.receipt_adjustment_method, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.update_receipt_expense(text, uuid, text, uuid, uuid, timestamptz, text, uuid, text, date, text, bigint, bigint, bigint, bigint, bigint, public.receipt_adjustment_method, jsonb, jsonb, jsonb) to service_role;

-- Receipt edits must update the receipt and ledger together.
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
    and receipt_scan_id is null
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

commit;
