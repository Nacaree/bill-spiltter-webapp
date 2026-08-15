create type public.expense_split_method as enum ('equal', 'exact');

alter table public.bill_participants
  add constraint bill_participants_bill_id_id_unique unique (bill_id, id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 120),
  amount_minor bigint not null check (amount_minor > 0),
  paid_by_participant_id uuid not null,
  split_method public.expense_split_method not null,
  category text not null check (
    category in (
      'general',
      'food',
      'transport',
      'accommodation',
      'shopping',
      'entertainment',
      'utilities'
    )
  ),
  expense_date date not null,
  notes text check (notes is null or char_length(notes) <= 1000),
  receipt_scan_id uuid,
  created_by_participant_id uuid not null,
  updated_by_participant_id uuid not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, bill_id),
  foreign key (bill_id, paid_by_participant_id)
    references public.bill_participants(bill_id, id),
  foreign key (bill_id, created_by_participant_id)
    references public.bill_participants(bill_id, id),
  foreign key (bill_id, updated_by_participant_id)
    references public.bill_participants(bill_id, id)
);

create index expenses_bill_date
  on public.expenses (bill_id, expense_date desc, created_at desc)
  where deleted_at is null;
create index expenses_paid_by
  on public.expenses (paid_by_participant_id)
  where deleted_at is null;
create index expenses_category
  on public.expenses (bill_id, category)
  where deleted_at is null;

create table public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  expense_id uuid not null,
  participant_id uuid not null,
  amount_minor bigint not null check (amount_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, participant_id),
  foreign key (expense_id, bill_id)
    references public.expenses(id, bill_id) on delete cascade,
  foreign key (bill_id, participant_id)
    references public.bill_participants(bill_id, id)
);

create index expense_shares_bill_participant
  on public.expense_shares (bill_id, participant_id);

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create trigger expense_shares_set_updated_at
before update on public.expense_shares
for each row execute function public.set_updated_at();

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
    and (b.expires_at is null or b.expires_at > now())
  for update of b, actor;

  if found_bill_id is null then
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

  delete from expense_shares where expense_id = target_expense_id;
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
    and (b.expires_at is null or b.expires_at > now())
  for update of b, actor;

  if found_bill_id is null then
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
    deleted_at = now(),
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

alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;

revoke all on public.expenses, public.expense_shares from anon, authenticated;
revoke execute on function public.create_manual_expense(
  text, uuid, text, text, bigint, uuid, public.expense_split_method,
  text, date, text, jsonb
) from public, anon, authenticated;
revoke execute on function public.update_manual_expense(
  text, uuid, text, uuid, text, bigint, uuid,
  public.expense_split_method, text, date, text, jsonb
) from public, anon, authenticated;
revoke execute on function public.remove_manual_expense(text, uuid, text, uuid)
  from public, anon, authenticated;

grant select, insert, update, delete on public.expenses, public.expense_shares
  to service_role;
grant execute on function public.create_manual_expense(
  text, uuid, text, text, bigint, uuid, public.expense_split_method,
  text, date, text, jsonb
) to service_role;
grant execute on function public.update_manual_expense(
  text, uuid, text, uuid, text, bigint, uuid,
  public.expense_split_method, text, date, text, jsonb
) to service_role;
grant execute on function public.remove_manual_expense(text, uuid, text, uuid)
  to service_role;
