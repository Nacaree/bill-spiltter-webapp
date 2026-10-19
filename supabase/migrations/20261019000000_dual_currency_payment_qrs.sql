begin;

-- Keep the original Phase 3 migration unchanged for existing hosted projects.
-- Both currencies are owner-confirmed bank-side options for amount-free QRs.
-- Existing single-currency rows and the original RPC remain compatible.
alter table public.bill_payment_methods
  drop constraint bill_payment_methods_supported_currencies_check,
  add constraint bill_payment_methods_supported_currencies_check check (
    array_ndims(supported_currencies) = 1
    and supported_currencies <@ array['KHR','USD']::text[]
    and (
      (cardinality(supported_currencies) = 1 and supported_currencies[1] is not null)
      or supported_currencies = array['KHR','USD']::text[]
      or supported_currencies = array['USD','KHR']::text[]
    )
  ),
  add constraint bill_payment_methods_fixed_currency_check check (
    fixed_amount_minor is null or cardinality(supported_currencies) = 1
  );

create function public.save_bill_payment_method_v2(
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
      or (qr_expires_at is not null and qr_expires_at <= now()) then
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
revoke execute on function public.save_bill_payment_method_v2(text, text, uuid, text, text, uuid, timestamptz, text, text, text, text, bigint, timestamptz, text[]) from public, anon, authenticated;
grant execute on function public.save_bill_payment_method_v2(text, text, uuid, text, text, uuid, timestamptz, text, text, text, text, bigint, timestamptz, text[]) to service_role;

commit;
