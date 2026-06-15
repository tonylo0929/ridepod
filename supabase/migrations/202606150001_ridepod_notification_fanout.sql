-- RidePod pod notification fanout.
-- Lets authenticated pod hosts/members fan out durable notifications without
-- exposing the service-role key to the browser.

create extension if not exists pgcrypto;

create or replace function public.notify_pod_audience(
  p_pod_id text,
  p_actor_user_id uuid,
  p_audiences text[],
  p_type text,
  p_title text,
  p_body text default null,
  p_self_title text default null,
  p_self_body text default null,
  p_related_url text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pod_uuid uuid;
  v_host_user_id uuid;
  v_recipient_count integer := 0;
begin
  if auth.uid() is null or auth.uid() <> p_actor_user_id then
    raise exception 'not allowed';
  end if;

  if p_pod_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'pod id must be a uuid';
  end if;

  v_pod_uuid := p_pod_id::uuid;

  select host_user_id
    into v_host_user_id
  from pods
  where id = v_pod_uuid;

  if v_host_user_id is null then
    raise exception 'pod not found';
  end if;

  if not (
    v_host_user_id = p_actor_user_id
    or exists (
      select 1
      from pod_members
      where pod_id = v_pod_uuid
        and user_id = p_actor_user_id
        and coalesce(status, 'joined') <> 'cancelled'
        and coalesce(member_state::text, 'REQUESTED') <> 'CANCELED'
    )
    or public.is_admin()
  ) then
    raise exception 'not allowed';
  end if;

  with active_members as (
    select distinct user_id
    from pod_members
    where pod_id = v_pod_uuid
      and user_id is not null
      and coalesce(status, 'joined') <> 'cancelled'
      and coalesce(member_state::text, 'REQUESTED') <> 'CANCELED'
  ),
  participant_ids as (
    select v_host_user_id as user_id
    union
    select user_id from active_members
  ),
  recipients as (
    select p_actor_user_id as user_id
    where 'actor' = any(p_audiences) or 'all' = any(p_audiences)
    union
    select v_host_user_id as user_id
    where 'host' = any(p_audiences)
    union
    select user_id
    from active_members
    where 'members' = any(p_audiences) or 'riders' = any(p_audiences)
    union
    select user_id
    from participant_ids
    where ('others' = any(p_audiences) or 'all' = any(p_audiences))
      and user_id <> p_actor_user_id
  ),
  deduped_recipients as (
    select distinct user_id
    from recipients
    where user_id is not null
      and (
        not p_dedupe
        or not exists (
          select 1
          from user_notifications existing
          where existing.recipient_user_id = recipients.user_id
            and existing.actor_user_id is not distinct from p_actor_user_id
            and existing.related_pod_id = p_pod_id
            and existing.type = p_type
            and existing.created_at >= now() - interval '15 minutes'
        )
      )
  ),
  inserted as (
    insert into user_notifications (
      recipient_user_id,
      actor_user_id,
      type,
      title,
      body,
      related_pod_id,
      related_url,
      metadata
    )
    select
      user_id,
      p_actor_user_id,
      p_type,
      case when user_id = p_actor_user_id then coalesce(p_self_title, p_title) else p_title end,
      case when user_id = p_actor_user_id then coalesce(p_self_body, p_body) else p_body end,
      p_pod_id,
      coalesce(p_related_url, '/pods/' || p_pod_id),
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('audience', p_audiences)
    from deduped_recipients
    returning 1
  )
  select count(*)
    into v_recipient_count
  from inserted;

  return v_recipient_count;
end;
$$;

grant execute on function public.notify_pod_audience(
  text,
  uuid,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  boolean
) to authenticated;
