-- RidePod E2E seed sanity checks.
-- Run after applying migrations and supabase/seed.sql in local/dev Supabase.

-- 1. Ride instances needing quote.
select
  ri.id as ride_instance_id,
  p.route_label,
  ri.departure_at,
  ri.instance_status
from ride_instances ri
join pods p on p.id = ri.pod_id
where p.ride_option = 'RIDE_APP_FIXED_QUOTE'
  and ri.instance_status = 'QUOTE_NEEDED'
order by ri.departure_at;

-- 2. Taxi meter instances needing meter proof.
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

-- 3. Settlement ready instances.
select
  ri.id as ride_instance_id,
  p.route_label,
  s.settlement_state,
  s.verified_fare_cents,
  s.dispute_deadline_at
from ride_instances ri
join pods p on p.id = ri.pod_id
join settlements s on s.id = ri.settlement_id
where ri.instance_status = 'SETTLEMENT_READY'
order by ri.departure_at;

-- 4. Dispute review instances.
select
  ri.id as ride_instance_id,
  p.route_label,
  s.settlement_state,
  arc.case_type,
  arc.review_state
from ride_instances ri
join pods p on p.id = ri.pod_id
left join settlements s on s.id = ri.settlement_id
left join admin_review_cases arc on arc.ride_instance_id = ri.id
where ri.instance_status = 'DISPUTE_REVIEW'
order by ri.departure_at;

-- 5. Open admin review cases.
select
  arc.id as admin_review_case_id,
  arc.case_type,
  arc.severity,
  arc.title,
  arc.review_state
from admin_review_cases arc
where arc.review_state in ('OPEN', 'UNDER_REVIEW', 'NEEDS_MORE_INFO')
order by arc.created_at desc;

-- 6. Recurring pod instances.
select
  p.id as recurring_pod_id,
  p.recurring_pattern,
  p.recurring_days,
  ri.id as ride_instance_id,
  ri.leg_type,
  ri.departure_at,
  ri.instance_status
from pods p
join ride_instances ri on ri.pod_id = p.id
where p.pod_type = 'RECURRING'
order by ri.departure_at;

-- 7. Proof replacement history.
select
  ri.id as ride_instance_id,
  pr.id as proof_id,
  pr.proof_type,
  pr.proof_status,
  pr.amount_cents,
  pr.file_url,
  pr.submitted_at,
  pr.reviewed_at
from ride_instances ri
join proofs pr on pr.ride_instance_id = ri.id
where ri.id = '30000000-0000-4000-8000-000000000108'
  and pr.proof_type = 'FINAL_RECEIPT'
order by pr.submitted_at;

-- 8. Above-cap proof cases.
select
  arc.id as admin_review_case_id,
  arc.case_type,
  pr.amount_cents,
  ri.booking_fare_cap_cents,
  pr.amount_cents - ri.booking_fare_cap_cents as amount_above_cap_cents
from admin_review_cases arc
join ride_instances ri on ri.id = arc.ride_instance_id
join proofs pr on pr.id = arc.proof_id
where arc.case_type like '%ABOVE_CAP%'
order by arc.created_at desc;

-- 9. Host's pods.
select
  p.id as pod_id,
  p.pod_type,
  p.ride_option,
  p.route_label,
  p.lifecycle_state
from pods p
where p.host_user_id = '00000000-0000-4000-8000-000000000101'
order by p.created_at;

-- 10. Guests' locked pods.
select
  profile.display_name,
  p.route_label,
  p.pod_type,
  ri.id as ride_instance_id,
  ri.instance_status
from pod_members pm
join profiles profile on profile.id = pm.user_id
join pods p on p.id = pm.pod_id
join ride_instances ri on ri.pod_id = p.id
where pm.role = 'GUEST'
  and pm.member_state = 'LOCKED'
order by profile.display_name, ri.departure_at;
