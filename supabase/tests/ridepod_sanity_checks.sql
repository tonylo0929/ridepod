-- RidePod MVP SQL sanity checks.
-- These queries are intended for local Supabase SQL editor / psql review after migrations and seed data.

-- 1. Ride app / fixed quote instances needing a fresh quote before booking.
select
  ri.id as ride_instance_id,
  p.route_label,
  ri.departure_at,
  ri.instance_status,
  ri.guests_locked_count,
  ri.required_guests_count
from ride_instances ri
join pods p on p.id = ri.pod_id
where p.ride_option = 'RIDE_APP_FIXED_QUOTE'
  and ri.instance_status = 'QUOTE_NEEDED'
order by ri.departure_at;

-- 2. Taxi meter instances needing meter proof or taxi receipt after ride.
select
  ri.id as ride_instance_id,
  p.route_label,
  ri.departure_at,
  ri.instance_status,
  ri.booking_fare_cap_cents
from ride_instances ri
join pods p on p.id = ri.pod_id
where p.ride_option = 'TAXI_METER'
  and ri.instance_status = 'METER_PROOF_NEEDED'
order by ri.departure_at;

-- 3. Settlement ready ride instances.
select
  ri.id as ride_instance_id,
  p.route_label,
  ri.departure_at,
  s.settlement_state,
  s.verified_fare_cents,
  s.host_reimbursement_cents,
  s.dispute_deadline_at
from ride_instances ri
join pods p on p.id = ri.pod_id
join settlements s on s.id = ri.settlement_id
where ri.instance_status = 'SETTLEMENT_READY'
order by ri.departure_at;

-- 4. Open admin review cases.
select
  arc.id as admin_review_case_id,
  arc.case_type,
  arc.severity,
  arc.title,
  arc.review_state,
  ri.departure_at,
  p.route_label
from admin_review_cases arc
left join ride_instances ri on ri.id = arc.ride_instance_id
left join pods p on p.id = ri.pod_id
where arc.review_state in ('OPEN', 'UNDER_REVIEW', 'NEEDS_MORE_INFO')
order by arc.created_at desc;

-- 5. Host pods.
select
  pods.id as pod_id,
  profiles.display_name as host_name,
  pods.pod_type,
  pods.ride_option,
  pods.route_label,
  pods.lifecycle_state,
  pods.booking_fare_cap_cents
from pods
join profiles on profiles.id = pods.host_user_id
where pods.host_user_id = '00000000-0000-4000-8000-000000000001'
order by pods.created_at;

-- 6. Guest locked rides.
select
  pm.user_id,
  profiles.display_name,
  pods.route_label,
  ri.id as ride_instance_id,
  ri.departure_at,
  ri.instance_status
from pod_members pm
join profiles on profiles.id = pm.user_id
join pods on pods.id = pm.pod_id
join ride_instances ri on ri.pod_id = pods.id
where pm.role = 'GUEST'
  and pm.member_state = 'LOCKED'
order by profiles.display_name, ri.departure_at;

-- 7. Ride app / fixed quote instances incorrectly missing quote before booking.
-- Expected result after seed: zero rows.
select
  ri.id as ride_instance_id,
  p.route_label,
  ri.departure_at,
  ri.instance_status,
  ri.quote_proof_id
from ride_instances ri
join pods p on p.id = ri.pod_id
where p.ride_option = 'RIDE_APP_FIXED_QUOTE'
  and ri.instance_status in ('READY_TO_BOOK', 'RIDE_BOOKED')
  and ri.quote_proof_id is null
order by ri.departure_at;
