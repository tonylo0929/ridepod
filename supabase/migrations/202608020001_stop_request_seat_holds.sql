-- Stop request seat-hold flow.
-- Product rule:
-- pending stop request = no seat reserved
-- approved stop request = temporary 10-minute seat hold
-- completed join = confirmed membership and requested stop becomes active

create table if not exists pod_stop_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references pods(id) on delete cascade,
  requester_id uuid not null references profiles(id),
  request_type text not null default 'quick_stop'
    check (request_type in ('pickup_stop', 'dropoff_stop', 'both', 'quick_stop')),
  requested_location text not null,
  requested_coordinates jsonb,
  optional_note text,
  status text not null default 'pending'
    check (status in (
      'pending',
      'pending_capacity_blocked',
      'approved_hold_active',
      'joined',
      'declined',
      'withdrawn',
      'approval_expired',
      'cancelled_by_host'
    )),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id),
  approved_at timestamptz,
  declined_at timestamptz,
  withdrawn_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists pod_seat_holds (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references pods(id) on delete cascade,
  rider_id uuid not null references profiles(id),
  stop_request_id uuid not null references pod_stop_requests(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'converted', 'expired', 'released')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  converted_at timestamptz,
  released_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists pod_stop_requests_one_active_per_rider
  on pod_stop_requests (ride_id, requester_id)
  where status in ('pending', 'pending_capacity_blocked', 'approved_hold_active');

create unique index if not exists pod_seat_holds_one_active_per_rider
  on pod_seat_holds (ride_id, rider_id)
  where status = 'active';

create unique index if not exists pod_seat_holds_one_active_per_request
  on pod_seat_holds (stop_request_id)
  where status = 'active';

create index if not exists pod_stop_requests_ride_status_idx
  on pod_stop_requests (ride_id, status, created_at desc);

create index if not exists pod_seat_holds_ride_status_idx
  on pod_seat_holds (ride_id, status, expires_at);

create or replace function ridepod_expire_stale_seat_holds(p_ride_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  update pod_seat_holds
     set status = 'expired',
         released_at = now(),
         updated_at = now()
   where ride_id = p_ride_id
     and status = 'active'
     and expires_at <= now();

  get diagnostics v_count = row_count;

  update pod_stop_requests request
     set status = 'approval_expired',
         updated_at = now()
    from pod_seat_holds hold
   where request.id = hold.stop_request_id
     and request.ride_id = p_ride_id
     and request.status = 'approved_hold_active'
     and hold.status = 'expired';

  return v_count;
end;
$$;

create or replace function ridepod_capacity_snapshot(p_ride_id uuid)
returns table (
  rider_capacity int,
  joined_count int,
  active_hold_count int,
  available_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_joined int;
  v_holds int;
begin
  perform ridepod_expire_stale_seat_holds(p_ride_id);

  select greatest(coalesce(pods.ideal_pod_size, 1) - 1, 0)
    into v_capacity
    from pods
   where id = p_ride_id;

  select count(*)
    into v_joined
    from pod_members
   where pod_id = p_ride_id
     and status = 'joined';

  select count(*)
    into v_holds
    from pod_seat_holds
   where ride_id = p_ride_id
     and status = 'active'
     and expires_at > now();

  rider_capacity := coalesce(v_capacity, 0);
  joined_count := coalesce(v_joined, 0);
  active_hold_count := coalesce(v_holds, 0);
  available_count := greatest(rider_capacity - joined_count - active_hold_count, 0);
  return next;
end;
$$;

create or replace function ridepod_submit_stop_request(
  p_ride_id uuid,
  p_requester_id uuid,
  p_request_type text,
  p_requested_location text,
  p_optional_note text default null,
  p_requested_coordinates jsonb default null
)
returns pod_stop_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pod pods%rowtype;
  v_existing pod_stop_requests%rowtype;
  v_result pod_stop_requests%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(p_ride_id::text));

  select * into v_pod from pods where id = p_ride_id;
  if not found then
    raise exception 'Ride not found' using errcode = 'P0002';
  end if;
  if v_pod.host_user_id = p_requester_id then
    raise exception 'Host cannot request a stop on their own ride' using errcode = 'P0001';
  end if;
  if v_pod.lifecycle_state in ('COMPLETED', 'SETTLED', 'CLOSED', 'CANCELED') then
    raise exception 'This ride is no longer accepting stop requests' using errcode = 'P0001';
  end if;
  if v_pod.departure_at is not null and v_pod.departure_at <= now() then
    raise exception 'Departure time has passed' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from pod_members
     where pod_id = p_ride_id
       and user_id = p_requester_id
       and status = 'joined'
  ) then
    raise exception 'You have already joined this ride' using errcode = 'P0001';
  end if;

  select * into v_existing
    from pod_stop_requests
   where ride_id = p_ride_id
     and requester_id = p_requester_id
     and status in ('pending', 'pending_capacity_blocked', 'approved_hold_active')
   order by created_at desc
   limit 1;

  if found then
    return v_existing;
  end if;

  insert into pod_stop_requests (
    ride_id,
    requester_id,
    request_type,
    requested_location,
    requested_coordinates,
    optional_note
  )
  values (
    p_ride_id,
    p_requester_id,
    coalesce(nullif(p_request_type, ''), 'quick_stop'),
    trim(p_requested_location),
    p_requested_coordinates,
    nullif(trim(coalesce(p_optional_note, '')), '')
  )
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function ridepod_approve_stop_request(
  p_stop_request_id uuid,
  p_reviewer_id uuid
)
returns table (
  request_row pod_stop_requests,
  hold_row pod_seat_holds,
  capacity_available int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request pod_stop_requests%rowtype;
  v_pod pods%rowtype;
  v_existing_hold pod_seat_holds%rowtype;
  v_available int;
  v_hold pod_seat_holds%rowtype;
begin
  select * into v_request from pod_stop_requests where id = p_stop_request_id;
  if not found then
    raise exception 'Stop request not found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request.ride_id::text));
  perform ridepod_expire_stale_seat_holds(v_request.ride_id);

  select * into v_pod from pods where id = v_request.ride_id;
  if not found then
    raise exception 'Ride not found' using errcode = 'P0002';
  end if;
  if v_pod.host_user_id <> p_reviewer_id then
    raise exception 'Only the host can approve this request' using errcode = 'P0001';
  end if;
  if v_pod.lifecycle_state in ('COMPLETED', 'SETTLED', 'CLOSED', 'CANCELED') then
    raise exception 'This ride is no longer joinable' using errcode = 'P0001';
  end if;

  select * into v_existing_hold
    from pod_seat_holds
   where stop_request_id = p_stop_request_id
     and status = 'active'
     and expires_at > now()
   limit 1;

  if found then
    request_row := v_request;
    hold_row := v_existing_hold;
    capacity_available := 0;
    return next;
    return;
  end if;

  select available_count into v_available
    from ridepod_capacity_snapshot(v_request.ride_id)
   limit 1;

  if coalesce(v_available, 0) <= 0 then
    update pod_stop_requests
       set status = 'pending_capacity_blocked',
           reviewed_at = now(),
           reviewed_by = p_reviewer_id,
           updated_at = now()
     where id = p_stop_request_id
     returning * into v_request;

    raise exception 'The last available seat has already been taken.' using errcode = 'P0001';
  end if;

  insert into pod_seat_holds (
    ride_id,
    rider_id,
    stop_request_id,
    expires_at
  )
  values (
    v_request.ride_id,
    v_request.requester_id,
    v_request.id,
    now() + interval '10 minutes'
  )
  returning * into v_hold;

  update pod_stop_requests
     set status = 'approved_hold_active',
         reviewed_at = now(),
         reviewed_by = p_reviewer_id,
         approved_at = now(),
         updated_at = now()
   where id = p_stop_request_id
   returning * into v_request;

  request_row := v_request;
  hold_row := v_hold;
  capacity_available := greatest(v_available - 1, 0);
  return next;
end;
$$;

create or replace function ridepod_decline_stop_request(
  p_stop_request_id uuid,
  p_reviewer_id uuid
)
returns pod_stop_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request pod_stop_requests%rowtype;
  v_pod pods%rowtype;
begin
  select * into v_request from pod_stop_requests where id = p_stop_request_id;
  if not found then
    raise exception 'Stop request not found' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_request.ride_id::text));

  select * into v_pod from pods where id = v_request.ride_id;
  if not found or v_pod.host_user_id <> p_reviewer_id then
    raise exception 'Only the host can decline this request' using errcode = 'P0001';
  end if;

  update pod_seat_holds
     set status = 'released',
         released_at = now(),
         updated_at = now()
   where stop_request_id = p_stop_request_id
     and status = 'active';

  update pod_stop_requests
     set status = 'declined',
         reviewed_at = now(),
         reviewed_by = p_reviewer_id,
         declined_at = now(),
         updated_at = now()
   where id = p_stop_request_id
   returning * into v_request;

  return v_request;
end;
$$;

create or replace function ridepod_withdraw_stop_request(
  p_stop_request_id uuid,
  p_requester_id uuid
)
returns pod_stop_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request pod_stop_requests%rowtype;
begin
  select * into v_request from pod_stop_requests where id = p_stop_request_id;
  if not found then
    raise exception 'Stop request not found' using errcode = 'P0002';
  end if;
  if v_request.requester_id <> p_requester_id then
    raise exception 'Only the requester can withdraw this request' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request.ride_id::text));

  update pod_seat_holds
     set status = 'released',
         released_at = now(),
         updated_at = now()
   where stop_request_id = p_stop_request_id
     and status = 'active';

  update pod_stop_requests
     set status = 'withdrawn',
         withdrawn_at = now(),
         updated_at = now()
   where id = p_stop_request_id
     and status in ('pending', 'pending_capacity_blocked', 'approved_hold_active')
   returning * into v_request;

  return v_request;
end;
$$;

create or replace function ridepod_join_pod_direct(
  p_pod_id uuid,
  p_user_id uuid
)
returns pod_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pod pods%rowtype;
  v_existing pod_members%rowtype;
  v_available int;
  v_member pod_members%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(p_pod_id::text));
  perform ridepod_expire_stale_seat_holds(p_pod_id);

  select * into v_pod from pods where id = p_pod_id;
  if not found then
    raise exception 'Pod not found' using errcode = 'P0002';
  end if;
  if v_pod.lifecycle_state in ('COMPLETED', 'SETTLED', 'CLOSED', 'CANCELED') then
    raise exception 'This pod is no longer joinable' using errcode = 'P0001';
  end if;
  if v_pod.departure_at is not null and v_pod.departure_at <= now() then
    raise exception 'Departure time has passed' using errcode = 'P0001';
  end if;
  if v_pod.host_user_id = p_user_id then
    raise exception 'Host cannot join their own pod' using errcode = 'P0001';
  end if;

  select * into v_existing
    from pod_members
   where pod_id = p_pod_id
     and user_id = p_user_id
   limit 1;

  if found and v_existing.status = 'joined' then
    return v_existing;
  end if;

  select available_count into v_available
    from ridepod_capacity_snapshot(p_pod_id)
   limit 1;

  if coalesce(v_available, 0) <= 0 then
    raise exception 'Pod full' using errcode = 'P0001';
  end if;

  if found then
    update pod_members
       set status = 'joined',
           member_state = 'REQUESTED',
           joined_at = now(),
           cancelled_at = null,
           updated_at = now()
     where id = v_existing.id
     returning * into v_member;
  else
    insert into pod_members (
      pod_id,
      user_id,
      role,
      member_state,
      status,
      joined_at,
      created_at,
      updated_at
    )
    values (
      p_pod_id,
      p_user_id,
      'guest',
      'REQUESTED',
      'joined',
      now(),
      now(),
      now()
    )
    returning * into v_member;
  end if;

  return v_member;
end;
$$;

create or replace function ridepod_complete_stop_request_join(
  p_stop_request_id uuid,
  p_requester_id uuid
)
returns table (
  request_row pod_stop_requests,
  hold_row pod_seat_holds,
  membership_row pod_members
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request pod_stop_requests%rowtype;
  v_hold pod_seat_holds%rowtype;
  v_member pod_members%rowtype;
  v_existing pod_members%rowtype;
  v_pod pods%rowtype;
begin
  select * into v_request from pod_stop_requests where id = p_stop_request_id;
  if not found then
    raise exception 'Stop request not found' using errcode = 'P0002';
  end if;
  if v_request.requester_id <> p_requester_id then
    raise exception 'Only the requester can complete this join' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request.ride_id::text));
  perform ridepod_expire_stale_seat_holds(v_request.ride_id);

  select * into v_pod from pods where id = v_request.ride_id;
  if not found or v_pod.lifecycle_state in ('COMPLETED', 'SETTLED', 'CLOSED', 'CANCELED') then
    raise exception 'This ride is no longer joinable' using errcode = 'P0001';
  end if;
  if v_pod.departure_at is not null and v_pod.departure_at <= now() then
    raise exception 'Departure time has passed' using errcode = 'P0001';
  end if;

  select * into v_hold
    from pod_seat_holds
   where stop_request_id = p_stop_request_id
     and rider_id = p_requester_id
     and status = 'active'
     and expires_at > now()
   limit 1;

  if not found then
    update pod_stop_requests
       set status = 'approval_expired',
           updated_at = now()
     where id = p_stop_request_id
       and status = 'approved_hold_active'
     returning * into v_request;
    raise exception 'Seat hold expired' using errcode = 'P0001';
  end if;

  select * into v_existing
    from pod_members
   where pod_id = v_request.ride_id
     and user_id = p_requester_id
   limit 1;

  if found and v_existing.status = 'joined' then
    v_member := v_existing;
  elsif found then
    update pod_members
       set status = 'joined',
           member_state = 'REQUESTED',
           joined_at = now(),
           cancelled_at = null,
           updated_at = now()
     where id = v_existing.id
     returning * into v_member;
  else
    insert into pod_members (
      pod_id,
      user_id,
      role,
      member_state,
      status,
      joined_at,
      created_at,
      updated_at
    )
    values (
      v_request.ride_id,
      p_requester_id,
      'guest',
      'REQUESTED',
      'joined',
      now(),
      now(),
      now()
    )
    returning * into v_member;
  end if;

  update pod_seat_holds
     set status = 'converted',
         converted_at = now(),
         updated_at = now()
   where id = v_hold.id
   returning * into v_hold;

  update pod_stop_requests
     set status = 'joined',
         completed_at = now(),
         updated_at = now()
   where id = p_stop_request_id
   returning * into v_request;

  request_row := v_request;
  hold_row := v_hold;
  membership_row := v_member;
  return next;
end;
$$;
