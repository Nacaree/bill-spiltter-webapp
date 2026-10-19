begin;

create table public.image_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  participant_id uuid not null,
  share_hash text not null check (share_hash ~ '^[a-f0-9]{64}$'),
  purpose text not null check (purpose in ('receipt', 'owner_qr')),
  filename text not null check (char_length(filename) between 1 and 200),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/heic','image/heif')),
  storage_key text not null unique,
  status text not null default 'pending' check (status in ('pending','finalizing','complete','rejected')),
  lease_id uuid,
  lease_started_at timestamptz,
  receipt_scan_id uuid unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  foreign key (bill_id, participant_id) references public.bill_participants(bill_id, id),
  foreign key (receipt_scan_id, bill_id) references public.receipt_scans(id, bill_id),
  check (storage_key = bill_id::text || '/' || id::text),
  check (purpose <> 'owner_qr' or mime_type in ('image/jpeg','image/png')),
  check (status <> 'complete' or purpose <> 'receipt' or receipt_scan_id is not null)
);
create index image_upload_reservations_cleanup on public.image_upload_reservations(created_at);
alter table public.image_upload_reservations enable row level security;
revoke all on public.image_upload_reservations from anon, authenticated;
grant select, insert, update, delete on public.image_upload_reservations to service_role;

-- The browser only supplies an upload ID. Resolve all paths and capabilities here.
create function public.get_image_upload(
  target_upload_id uuid, actor_participant_id uuid, actor_session_hash text,
  recovery_hash text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  found image_upload_reservations%rowtype;
  currency_code text;
begin
  select r.* into found
  from image_upload_reservations r
  join bills b on b.id = r.bill_id and b.public_id_hash = r.share_hash
  join bill_participants actor on actor.bill_id = b.id and actor.id = r.participant_id
  where r.id = target_upload_id and actor.id = actor_participant_id
    and actor.session_token_hash = actor_session_hash and actor.deactivated_at is null
    and b.archived_at is null and (b.expires_at is null or b.expires_at > now())
    and (r.purpose = 'receipt' or (actor.is_creator and b.creator_key_hash = recovery_hash))
  for update of r, b, actor;
  if found.id is null then
    raise exception 'This upload is unavailable for this participant session' using errcode = 'P0001';
  end if;
  if found.expires_at <= now() or found.status = 'rejected' then
    raise exception 'This upload expired or was rejected. Choose the image again.' using errcode = 'P0004';
  end if;
  select b.currency into currency_code from bills b where b.id = found.bill_id;
  return to_jsonb(found) || jsonb_build_object('bill_currency', currency_code);
end;
$$;

create function public.claim_image_upload(
  target_upload_id uuid, actor_participant_id uuid, actor_session_hash text,
  recovery_hash text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  authorized jsonb;
  claimed image_upload_reservations%rowtype;
begin
  authorized := get_image_upload(target_upload_id, actor_participant_id, actor_session_hash, recovery_hash);
  if authorized->>'status' = 'complete' then
    return authorized || jsonb_build_object('acquired', false);
  end if;
  if authorized->>'status' = 'finalizing'
    and (authorized->>'lease_started_at')::timestamptz > now() - interval '120 seconds' then
    raise exception 'This image is still being processed. Try again shortly.' using errcode = 'P0005';
  end if;
  update image_upload_reservations set status = 'finalizing', lease_id = gen_random_uuid(),
    lease_started_at = clock_timestamp() where id = target_upload_id returning * into claimed;
  return to_jsonb(claimed) || jsonb_build_object('bill_currency', authorized->>'bill_currency', 'acquired', true);
end;
$$;

create function public.finish_receipt_upload(
  target_upload_id uuid, actor_participant_id uuid, actor_session_hash text,
  target_lease_id uuid, validated_mime_type text, validated_width integer, validated_height integer
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  authorized jsonb;
begin
  authorized := get_image_upload(target_upload_id, actor_participant_id, actor_session_hash);
  if authorized->>'purpose' <> 'receipt' then
    raise exception 'This is not a receipt upload' using errcode = 'P0004';
  end if;
  if authorized->>'status' = 'complete' then
    return jsonb_build_object('scan_id', authorized->>'receipt_scan_id', 'should_process', false);
  end if;
  if authorized->>'status' <> 'finalizing' or (authorized->>'lease_id')::uuid is distinct from target_lease_id then
    raise exception 'Image processing changed. Try again shortly.' using errcode = 'P0005';
  end if;
  if validated_mime_type is distinct from authorized->>'mime_type' then
    raise exception 'The uploaded image type changed. Choose the image again.' using errcode = 'P0004';
  end if;
  insert into receipt_scans(id, bill_id, uploaded_by_participant_id, storage_key,
    original_filename, mime_type, image_width, image_height, currency)
  values (target_upload_id, (authorized->>'bill_id')::uuid, actor_participant_id,
    authorized->>'storage_key', authorized->>'filename', validated_mime_type,
    validated_width, validated_height, authorized->>'bill_currency');
  update image_upload_reservations set status = 'complete', receipt_scan_id = target_upload_id,
    lease_id = null, lease_started_at = null where id = target_upload_id;
  return jsonb_build_object('scan_id', target_upload_id, 'should_process', true);
end;
$$;

create function public.finish_qr_upload(
  target_upload_id uuid, actor_participant_id uuid, actor_session_hash text,
  recovery_hash text, target_lease_id uuid
) returns void language plpgsql security invoker set search_path = public as $$
declare authorized jsonb;
begin
  authorized := get_image_upload(target_upload_id, actor_participant_id, actor_session_hash, recovery_hash);
  if authorized->>'purpose' <> 'owner_qr' then
    raise exception 'This is not a QR upload' using errcode = 'P0004';
  end if;
  if authorized->>'status' = 'complete' then return; end if;
  if authorized->>'status' <> 'finalizing' or (authorized->>'lease_id')::uuid is distinct from target_lease_id then
    raise exception 'Image processing changed. Try again shortly.' using errcode = 'P0005';
  end if;
  update image_upload_reservations set status = 'complete', lease_id = null,
    lease_started_at = null where id = target_upload_id;
end;
$$;

revoke execute on function public.get_image_upload(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.claim_image_upload(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.finish_receipt_upload(uuid, uuid, text, uuid, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.finish_qr_upload(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.get_image_upload(uuid, uuid, text, text) to service_role;
grant execute on function public.claim_image_upload(uuid, uuid, text, text) to service_role;
grant execute on function public.finish_receipt_upload(uuid, uuid, text, uuid, text, integer, integer) to service_role;
grant execute on function public.finish_qr_upload(uuid, uuid, text, text, uuid) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('image-upload-staging', 'image-upload-staging', false, 10485760,
  array['image/jpeg','image/png','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.receipt_scans add column extraction_attempt_id uuid,
  add column processing_started_at timestamptz;

create function public.claim_receipt_extraction_v2(target_scan_id uuid)
returns table (scan_id uuid, storage_key text, mime_type text, bill_currency char(3), attempt_id uuid)
language sql security invoker set search_path = public as $$
  update receipt_scans scan set status = 'processing', error_code = null,
    attempt_count = scan.attempt_count + 1, extraction_attempt_id = gen_random_uuid(),
    processing_started_at = clock_timestamp()
  where scan.id = target_scan_id and scan.expires_at > now()
    and (scan.status in ('uploaded','failed') or (scan.status = 'processing'
      and coalesce(scan.processing_started_at, scan.updated_at) <= now() - interval '150 seconds'))
    and exists (select 1 from bills b where b.id = scan.bill_id and b.archived_at is null
      and (b.expires_at is null or b.expires_at > now()))
  returning scan.id, scan.storage_key, scan.mime_type, scan.currency, scan.extraction_attempt_id;
$$;

create function public.fail_receipt_extraction_v2(target_scan_id uuid, expected_attempt_id uuid, failure_code text)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  update receipt_scans set status = 'failed', error_code = failure_code
  where id = target_scan_id and status = 'processing' and extraction_attempt_id = expected_attempt_id;
  return found;
end;
$$;
revoke execute on function public.claim_receipt_extraction_v2(uuid) from public, anon, authenticated;
revoke execute on function public.fail_receipt_extraction_v2(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_receipt_extraction_v2(uuid) to service_role;
grant execute on function public.fail_receipt_extraction_v2(uuid, uuid, text) to service_role;

-- The guarded store function and legacy permission changes follow below.

create function public.store_receipt_extraction_v2(
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
  if not exists (
    select 1 from receipt_scans scan
    where scan.id = target_scan_id and scan.status = 'processing'
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

revoke execute on function public.store_receipt_extraction_v2(uuid, uuid, text, date, char, bigint, bigint, bigint, bigint, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.store_receipt_extraction_v2(uuid, uuid, text, date, char, bigint, bigint, bigint, bigint, bigint, text, text, jsonb) to service_role;
-- Retire unguarded worker entrypoints so older workers cannot overwrite a new attempt.
revoke execute on function public.claim_receipt_extraction(uuid) from service_role;
revoke execute on function public.store_receipt_extraction(uuid, text, date, char, bigint, bigint, bigint, bigint, bigint, text, text, jsonb) from service_role;

commit;
