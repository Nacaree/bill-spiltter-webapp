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
    and (b.expires_at is null or b.expires_at > now())
  for update of b, actor;

  if found_bill_id is null then
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
