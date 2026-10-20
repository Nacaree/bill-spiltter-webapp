begin;

-- Only trusted server code can select policies or consume these counters.
create table public.rate_limit_policies (
  name text primary key,
  quota integer not null check (quota > 0),
  window_seconds integer not null check (window_seconds > 0)
);
insert into public.rate_limit_policies values
  ('action_ip',300,60), ('create_ip',10,600), ('create_ip_day',50,86400),
  ('people_ip',60,600), ('people_bill',100,600),
  ('upload_actor',20,600), ('upload_bill',60,600), ('upload_bill_day',100,86400), ('upload_ip',120,600),
  ('complete_actor',60,600), ('complete_bill',180,600),
  ('write_actor',60,60), ('write_bill',300,60),
  ('extract_actor',10,600), ('extract_bill',30,3600), ('extract_app',100,86400);
create table public.rate_limit_counters (
  policy text not null references public.rate_limit_policies(name),
  subject text not null check (char_length(subject) between 1 and 150),
  window_start timestamptz not null,
  expires_at timestamptz not null,
  used integer not null default 0 check (used >= 0),
  primary key (policy, subject, window_start)
);
create index rate_limit_counter_expiry on public.rate_limit_counters(expires_at);
alter table public.rate_limit_policies enable row level security;
alter table public.rate_limit_counters enable row level security;
revoke all on public.rate_limit_policies, public.rate_limit_counters from public, anon, authenticated;
grant select on public.rate_limit_policies to service_role;
grant select, insert, update, delete on public.rate_limit_counters to service_role;

create function public.cleanup_rate_limits() returns integer
language plpgsql security invoker set search_path = public as $$
declare removed integer;
begin
  with expired as (
    select policy, subject, window_start from rate_limit_counters
    where expires_at < clock_timestamp() - interval '24 hours'
    order by expires_at limit 100 for update skip locked
  ) delete from rate_limit_counters c using expired e
    where c.policy=e.policy and c.subject=e.subject and c.window_start=e.window_start;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create function public.consume_rate_limits(buckets jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  item record; policy_row rate_limit_policies%rowtype;
  bucket_start timestamptz; bucket_end timestamptz; current_used integer;
  checked_at timestamptz := clock_timestamp(); retry_seconds integer := 0;
  blocked_policy text; entries jsonb := '[]'::jsonb;
begin
  if buckets is null or jsonb_typeof(buckets) is distinct from 'array' then
    raise exception 'Invalid rate limit request';
  end if;
  if jsonb_array_length(buckets) not between 1 and 20 then
    raise exception 'Invalid rate limit request';
  end if;
  perform cleanup_rate_limits();
  -- Insert and lock in the same order in every caller, including extraction.
  for item in select distinct x.policy, x.subject
    from jsonb_to_recordset(buckets) as x(policy text, subject text)
    order by x.policy, x.subject
  loop
    select * into strict policy_row from rate_limit_policies where name=item.policy;
    if item.subject is null or char_length(item.subject) not between 1 and 150 then
      raise exception 'Invalid rate limit subject';
    end if;
    bucket_start := to_timestamp(floor(extract(epoch from checked_at)/policy_row.window_seconds)*policy_row.window_seconds);
    bucket_end := bucket_start + make_interval(secs => policy_row.window_seconds);
    insert into rate_limit_counters(policy,subject,window_start,expires_at)
      values(item.policy,item.subject,bucket_start,bucket_end) on conflict do nothing;
    select used into current_used from rate_limit_counters
      where policy=item.policy and subject=item.subject and window_start=bucket_start for update;
    entries := entries || jsonb_build_array(jsonb_build_object('policy',item.policy,'subject',item.subject,'start',bucket_start));
    if current_used >= policy_row.quota and ceil(extract(epoch from bucket_end-checked_at))::integer > retry_seconds then
      retry_seconds := greatest(1,ceil(extract(epoch from bucket_end-checked_at))::integer);
      blocked_policy := item.policy;
    end if;
  end loop;
  if retry_seconds > 0 then
    return jsonb_build_object('allowed',false,'retry_after_seconds',retry_seconds,'policy',blocked_policy);
  end if;
  for item in select * from jsonb_to_recordset(entries) as x(policy text,subject text,start timestamptz)
  loop
    update rate_limit_counters c set used=c.used+1
      where c.policy=item.policy and c.subject=item.subject and c.window_start=item.start;
  end loop;
  return jsonb_build_object('allowed',true,'retry_after_seconds',0);
end;
$$;

alter table public.receipt_scans add column next_retry_at timestamptz;
create function public.claim_receipt_extraction_v3(target_scan_id uuid, actor_participant_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare scan receipt_scans%rowtype; actor uuid; quota jsonb; attempt uuid;
begin
  select s.* into scan from receipt_scans s join bills b on b.id=s.bill_id
    where s.id=target_scan_id and s.expires_at>now() and b.archived_at is null
      and (b.expires_at is null or b.expires_at>now()) for update of s;
  if scan.id is null then return jsonb_build_object('claimed',false); end if;
  actor := coalesce(actor_participant_id, scan.uploaded_by_participant_id);
  if not exists (select 1 from bill_participants p where p.id=actor and p.bill_id=scan.bill_id and p.deactivated_at is null) then
    raise exception 'Participant session required' using errcode='P0001';
  end if;
  if not (scan.status in ('uploaded','failed') or (scan.status='processing' and
    coalesce(scan.processing_started_at,scan.updated_at)<=now()-interval '150 seconds')) then
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
revoke execute on function public.cleanup_rate_limits(), public.consume_rate_limits(jsonb),
  public.claim_receipt_extraction_v3(uuid,uuid) from public, anon, authenticated;
grant execute on function public.cleanup_rate_limits(), public.consume_rate_limits(jsonb),
  public.claim_receipt_extraction_v3(uuid,uuid) to service_role;
-- Pause extraction while applying this migration and deploying the new worker.
revoke execute on function public.claim_receipt_extraction_v2(uuid) from service_role;
commit;
