create or replace function public.add_bill_participant(
  share_hash text,
  actor_participant_id uuid,
  actor_session_hash text,
  participant_name text
) returns table (participant_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  new_participant_id uuid;
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

  insert into bill_participants (bill_id, display_name)
  values (found_bill_id, trim(participant_name))
  returning id into new_participant_id;

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
    'participant',
    new_participant_id,
    'participant.added',
    jsonb_build_object('display_name', trim(participant_name))
  );

  return query select new_participant_id;
end;
$$;

create or replace function public.claim_bill_participant(
  share_hash text,
  target_participant_id uuid,
  participant_session_hash text
) returns table (bill_id uuid, participant_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  found_bill_id uuid;
  found_participant_id uuid;
begin
  select b.id, participant.id
  into found_bill_id, found_participant_id
  from bills b
  join bill_participants participant on participant.bill_id = b.id
  where b.public_id_hash = share_hash
    and b.archived_at is null
    and (b.expires_at is null or b.expires_at > now())
    and participant.id = target_participant_id
    and participant.session_token_hash is null
    and participant.deactivated_at is null
  for update of participant;

  if found_participant_id is null then
    raise exception 'Participant is unavailable' using errcode = 'P0003';
  end if;

  update bill_participants
  set session_token_hash = participant_session_hash
  where id = found_participant_id;

  insert into activity_log (
    bill_id,
    actor_participant_id,
    entity_type,
    entity_id,
    action
  ) values (
    found_bill_id,
    found_participant_id,
    'participant',
    found_participant_id,
    'participant.claimed'
  );

  return query select found_bill_id, found_participant_id;
end;
$$;

revoke execute on function public.add_bill_participant(text, uuid, text, text)
  from public, anon, authenticated;
revoke execute on function public.claim_bill_participant(text, uuid, text)
  from public, anon, authenticated;

grant execute on function public.add_bill_participant(text, uuid, text, text)
  to service_role;
grant execute on function public.claim_bill_participant(text, uuid, text)
  to service_role;
