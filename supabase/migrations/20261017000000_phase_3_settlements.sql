begin;

-- All financial writes lock the bill, matching expense/receipt transactions.
create table public.settlements (
  id uuid primary key,
  bill_id uuid not null references public.bills(id) on delete cascade,
  from_participant_id uuid not null,
  to_participant_id uuid not null,
  amount_minor bigint not null check (amount_minor between 1 and 9007199254740991),
  settled_at timestamptz not null,
  notes text check (char_length(notes) <= 1000),
  created_by_participant_id uuid not null,
  updated_by_participant_id uuid not null,
  deleted_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (from_participant_id <> to_participant_id),
  foreign key (bill_id, from_participant_id) references public.bill_participants(bill_id, id),
  foreign key (bill_id, to_participant_id) references public.bill_participants(bill_id, id),
  foreign key (bill_id, created_by_participant_id) references public.bill_participants(bill_id, id),
  foreign key (bill_id, updated_by_participant_id) references public.bill_participants(bill_id, id)
);
create index settlements_bill_date on public.settlements(bill_id, settled_at desc) where deleted_at is null;
alter table public.settlements enable row level security;
revoke all on public.settlements from anon, authenticated;
grant select, insert, update, delete on public.settlements to service_role;

create function public.save_bill_settlement(
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
    and (b.expires_at is null or b.expires_at > now())
  for update of b, actor;
  if found_bill_id is null then
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
revoke execute on function public.save_bill_settlement(text, uuid, text, uuid, text, uuid, uuid, bigint, date, text, timestamptz) from public, anon, authenticated;
grant execute on function public.save_bill_settlement(text, uuid, text, uuid, text, uuid, uuid, bigint, date, text, timestamptz) to service_role;

-- One statement gives expenses, shares and settlements the same MVCC snapshot.
-- Include deactivated people: their historical balances still need settling.
create function public.get_bill_ledger(share_hash text) returns jsonb
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
    and (b.expires_at is null or b.expires_at > now());
$$;
revoke execute on function public.get_bill_ledger(text) from public, anon, authenticated;
grant execute on function public.get_bill_ledger(text) to service_role;

create table public.bill_payment_methods (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null unique references public.bills(id) on delete cascade,
  owner_participant_id uuid not null,
  method_type text not null default 'aba_qr' check (method_type = 'aba_qr'),
  qr_storage_key text not null unique,
  recipient_label text not null check (char_length(trim(recipient_label)) between 1 and 100),
  supported_currencies text[] not null check (cardinality(supported_currencies) = 1 and supported_currencies <@ array['USD','KHR']::text[]),
  qr_payload_hash text not null check (qr_payload_hash ~ '^[a-f0-9]{64}$'),
  fixed_amount_minor bigint check (fixed_amount_minor between 1 and 9007199254740991),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (bill_id, owner_participant_id) references public.bill_participants(bill_id, id)
);
alter table public.bill_payment_methods enable row level security;
revoke all on public.bill_payment_methods from anon, authenticated;
grant select, insert, update, delete on public.bill_payment_methods to service_role;

create function public.save_bill_payment_method(
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
    and b.archived_at is null and (b.expires_at is null or b.expires_at > now())
  for update of b, actor;
  if found_bill_id is null then
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
      or (qr_expires_at is not null and qr_expires_at <= now()) then
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
revoke execute on function public.save_bill_payment_method(text, text, uuid, text, text, uuid, timestamptz, text, text, text, text, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.save_bill_payment_method(text, text, uuid, text, text, uuid, timestamptz, text, text, text, text, bigint, timestamptz) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('payment-qrs', 'payment-qrs', false, 2097152, array['image/png'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

commit;
