-- RidePod E2E seed sanity checks.
-- Run after applying migrations and supabase/seed.sql in local/dev Supabase.
-- Manual SQL checks only; expected row counts are documented above each query.

-- 1. Ride app instances needing quote.
-- Expected: Scenario A appears.
select
  ri.id as ride_instance_id,
  ri.pod_id,
  ri.route_label,
  ri.departure_at,
  p.ride_option,
  ri.instance_status,
  ri.guests_locked_count,
  ri.required_guests_count
from ride_instances ri
join pods p on p.id = ri.pod_id
where p.ride_option = 'RIDE_APP_FIXED_QUOTE'
  and ri.instance_status = 'QUOTE_NEEDED'
  and ri.guests_locked_count >= ri.required_guests_count
  and ri.quote_proof_id is null
order by ri.departure_at;

-- 2. Ride app instances ready to book.
-- Expected: Scenario B appears.
select
  ri.id as ride_instance_id,
  ri.quote_proof_id,
  quote.amount_cents as quote_amount_cents,
  ri.booking_fare_cap_cents,
  ri.instance_status
from ride_instances ri
join pods p on p.id = ri.pod_id
join proofs quote on quote.id = ri.quote_proof_id
where p.ride_option = 'RIDE_APP_FIXED_QUOTE'
  and ri.instance_status = 'READY_TO_BOOK'
  and quote.proof_type = 'QUOTE_SCREENSHOT'
  and quote.proof_status = 'VERIFIED'
order by ri.departure_at;

-- 3. Ride app instances needing receipt.
-- Expected: Scenario C appears.
select
  ri.id as ride_instance_id,
  ri.route_label,
  ri.instance_status as status,
  quote.proof_status as quote_proof_status,
  ri.receipt_proof_id is null as receipt_proof_missing
from ride_instances ri
join pods p on p.id = ri.pod_id
left join proofs quote on quote.id = ri.quote_proof_id
where p.ride_option = 'RIDE_APP_FIXED_QUOTE'
  and ri.instance_status = 'RECEIPT_NEEDED'
  and quote.proof_status = 'VERIFIED'
  and ri.receipt_proof_id is null
order by ri.departure_at;

-- 4. Taxi meter instances needing meter proof.
-- Expected: Scenario D appears.
select
  ri.id as ride_instance_id,
  ri.route_label,
  p.ride_option,
  ri.instance_status,
  ri.booking_fare_cap_cents
from ride_instances ri
join pods p on p.id = ri.pod_id
where p.ride_option = 'TAXI_METER'
  and ri.instance_status = 'METER_PROOF_NEEDED'
order by ri.departure_at;

-- 5. Settlement ready instances.
-- Expected: Scenario E appears.
select
  ri.id as ride_instance_id,
  ri.settlement_id,
  s.verified_fare_cents,
  s.booking_fare_cap_cents,
  s.dispute_deadline_at
from ride_instances ri
join settlements s on s.id = ri.settlement_id
join proofs proof on proof.id = ri.receipt_proof_id
where ri.instance_status = 'SETTLEMENT_READY'
  and proof.proof_status = 'VERIFIED'
  and s.settlement_state in ('DISPUTE_WINDOW', 'RIDER_NOTICE_SENT')
order by ri.departure_at;

-- 6. Dispute review instances.
-- Expected: Scenario F appears.
select
  ri.id as ride_instance_id,
  s.settlement_state,
  arc.id as admin_review_case_id,
  arc.case_type,
  arc.review_state
from ride_instances ri
left join settlements s on s.id = ri.settlement_id
left join admin_review_cases arc on arc.ride_instance_id = ri.id
where ri.instance_status = 'DISPUTE_REVIEW'
  and (s.settlement_state in ('DISPUTE_HOLD', 'ADMIN_REVIEW') or arc.case_type like '%DISPUTE%')
order by ri.departure_at;

-- 7. Above-cap proof cases.
-- Expected: Scenario G appears.
select
  arc.id as case_id,
  arc.case_type,
  arc.severity,
  proof.amount_cents as proof_amount_cents,
  ri.booking_fare_cap_cents,
  proof.amount_cents - ri.booking_fare_cap_cents as difference_cents
from admin_review_cases arc
join ride_instances ri on ri.id = arc.ride_instance_id
join proofs proof on proof.id = arc.proof_id
where proof.amount_cents > ri.booking_fare_cap_cents
  and arc.case_type like '%ABOVE_CAP%'
order by difference_cents desc;

-- 8. Proof replacement history.
-- Expected: Scenario H appears with proof_count greater than 1.
select
  grouped.ride_instance_id,
  grouped.proof_type,
  grouped.proof_count,
  latest.id as latest_proof_id,
  latest.proof_status as latest_status
from (
  select
    ride_instance_id,
    proof_type,
    count(*) as proof_count,
    max(submitted_at) as latest_submitted_at
  from proofs
  group by ride_instance_id, proof_type
  having count(*) > 1
) grouped
join proofs latest
  on latest.ride_instance_id = grouped.ride_instance_id
  and latest.proof_type = grouped.proof_type
  and latest.submitted_at = grouped.latest_submitted_at
order by grouped.ride_instance_id, grouped.proof_type;

-- 9. Recurring back-and-forth instances.
-- Expected: Scenario I appears with outbound and return legs.
select
  p.id as pod_id,
  p.route_label,
  p.recurring_pattern,
  ri.id as ride_instance_id,
  ri.leg_type,
  ri.departure_at,
  ri.instance_status
from pods p
join ride_instances ri on ri.pod_id = p.id
where p.pod_type = 'RECURRING'
  and p.recurring_pattern = 'BACK_AND_FORTH'
  and ri.leg_type in ('OUTBOUND', 'RETURN')
order by ri.departure_at;

-- 10. Host pods.
-- Expected: Tony Host scheduled and recurring pods appear.
select
  profile.display_name as host_name,
  p.id as pod_id,
  p.pod_type,
  p.ride_option,
  p.route_label
from pods p
join profiles profile on profile.id = p.host_user_id
where profile.email = 'tony.host@example.com'
order by p.pod_type, p.route_label, p.id;

-- 11. Guest locked rides.
-- Expected: Amy, Bella, and Chris appear with locked pod membership.
select
  profile.display_name as guest_name,
  p.id as pod_id,
  p.route_label,
  pm.member_state,
  pm.max_charge_cents
from pod_members pm
join profiles profile on profile.id = pm.user_id
join pods p on p.id = pm.pod_id
where pm.role = 'GUEST'
  and pm.member_state in ('LOCKED', 'CONFIRMED')
order by profile.display_name, p.id;

-- 12. Admin review queue open cases.
-- Expected: above-cap, dispute, and replacement review cases appear.
select
  arc.id as case_id,
  arc.case_type,
  arc.severity,
  arc.review_state,
  arc.title,
  p.route_label
from admin_review_cases arc
left join ride_instances ri on ri.id = arc.ride_instance_id
left join pods p on p.id = ri.pod_id
where arc.review_state in ('OPEN', 'UNDER_REVIEW', 'NEEDS_MORE_INFO')
order by arc.created_at desc;

-- 13. Proof certification check.
-- Expected: zero rows for seeded proof scenarios.
select
  proof.id as proof_id,
  proof.ride_instance_id,
  proof.proof_type,
  proof.proof_status,
  proof.certification_accepted
from proofs proof
where coalesce(proof.certification_accepted, false) = false
order by proof.submitted_at;

-- 14. No impossible ride app ready-to-book status.
-- Expected: zero rows.
select
  ri.id as ride_instance_id,
  ri.instance_status,
  ri.quote_proof_id,
  quote.proof_status as quote_proof_status
from ride_instances ri
join pods p on p.id = ri.pod_id
left join proofs quote on quote.id = ri.quote_proof_id
where p.ride_option = 'RIDE_APP_FIXED_QUOTE'
  and ri.instance_status = 'READY_TO_BOOK'
  and (ri.quote_proof_id is null or quote.proof_status <> 'VERIFIED');

-- 15. Taxi meter quote misuse check.
-- Expected: zero rows.
select
  ri.id as ride_instance_id,
  p.ride_option,
  ri.instance_status,
  ri.quote_proof_id
from ride_instances ri
join pods p on p.id = ri.pod_id
where p.ride_option = 'TAXI_METER'
  and (
    ri.instance_status in ('QUOTE_NEEDED', 'QUOTE_UNDER_REVIEW', 'READY_TO_BOOK')
    or ri.quote_proof_id is not null
  );
