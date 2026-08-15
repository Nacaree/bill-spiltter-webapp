create table public.bills (
  id uuid primary key default gen_random_uuid(),
  public_id_hash text not null unique check (public_id_hash ~ '^[0-9a-f]{64}$'),
  creator_key_hash text not null unique check (creator_key_hash ~ '^[0-9a-f]{64}$'),
  name text not null check (char_length(trim(name)) between 1 and 100),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  archived_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bill_participants (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  session_token_hash text check (session_token_hash is null or session_token_hash ~ '^[0-9a-f]{64}$'),
  is_creator boolean not null default false,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index bill_participants_active_name
  on public.bill_participants (bill_id, lower(display_name))
  where deactivated_at is null;
create unique index bill_participants_one_creator
  on public.bill_participants (bill_id)
  where is_creator and deactivated_at is null;
create unique index bill_participants_active_session
  on public.bill_participants (bill_id, session_token_hash)
  where session_token_hash is not null and deactivated_at is null;

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  actor_participant_id uuid references public.bill_participants(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_bill_created on public.activity_log (bill_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bills_set_updated_at
before update on public.bills
for each row execute function public.set_updated_at();

create trigger bill_participants_set_updated_at
before update on public.bill_participants
for each row execute function public.set_updated_at();

create or replace function public.create_bill_with_creator(
  bill_name text,
  bill_currency char(3),
  share_hash text,
  recovery_hash text,
  creator_name text,
  participant_session_hash text,
  bill_expires_at timestamptz default (now() + interval '12 months')
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
    and (expires_at is null or expires_at > now())
  for update;

  if found_bill_id is null then
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

alter table public.bills enable row level security;
alter table public.bill_participants enable row level security;
alter table public.activity_log enable row level security;

-- Phase 1 routes use the server-only database role after resolving the capability.
revoke all on public.bills, public.bill_participants, public.activity_log from anon, authenticated;
revoke execute on function public.create_bill_with_creator(text, char, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.join_bill(text, text, text) from public, anon, authenticated;

grant select, insert, update, delete on public.bills, public.bill_participants, public.activity_log to service_role;
grant execute on function public.create_bill_with_creator(text, char, text, text, text, text, timestamptz) to service_role;
grant execute on function public.join_bill(text, text, text) to service_role;
