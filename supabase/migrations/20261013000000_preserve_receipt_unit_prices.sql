-- Preserve reviewed unit prices and quantities in the same confirmation transaction.
-- Replacing the existing function retains its restricted service_role permissions.
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
