-- RidePod local/dev E2E seed data.
-- Deterministic rows are safe to re-run and are not intended for production data.
-- Notifications are currently derived/computed in app.

insert into profiles (id, display_name, email)
values
  ('00000000-0000-4000-8000-000000000101', 'Tony Host', 'tony.host@example.com'),
  ('00000000-0000-4000-8000-000000000102', 'Amy Guest', 'amy.guest@example.com'),
  ('00000000-0000-4000-8000-000000000103', 'Bella Guest', 'bella.guest@example.com'),
  ('00000000-0000-4000-8000-000000000104', 'Chris Guest', 'chris.guest@example.com'),
  ('00000000-0000-4000-8000-000000000105', 'Admin Reviewer', 'admin@example.com')
on conflict (id) do update set
  display_name = excluded.display_name,
  email = excluded.email;

insert into pods (
  id,
  host_user_id,
  pod_type,
  lifecycle_state,
  ride_option,
  route_label,
  pickup_point,
  dropoff_point,
  ideal_pod_size,
  minimum_locked_guests,
  booking_fare_cap_cents,
  current_estimate_cents,
  platform_fee_rate_bps,
  minimum_platform_fee_cents,
  currency,
  departure_at,
  recurring_days,
  recurring_pattern
)
values
  ('10000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101', 'SCHEDULED', 'LOCKED', 'RIDE_APP_FIXED_QUOTE', 'USC Village -> LAX Terminal 3', 'USC Village Rideshare Zone', 'LAX Terminal 3 Departures', 4, 3, 10100, 8600, 1000, 600, 'HKD', '2026-06-02 08:00:00+00', null, null),
  ('10000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101', 'SCHEDULED', 'HOST_CAN_BOOK', 'RIDE_APP_FIXED_QUOTE', 'USC Village -> LAX Terminal 3', 'USC Village Rideshare Zone', 'LAX Terminal 3 Departures', 4, 3, 10100, 8600, 1000, 600, 'HKD', '2026-06-03 08:00:00+00', null, null),
  ('10000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000101', 'SCHEDULED', 'COMPLETED', 'RIDE_APP_FIXED_QUOTE', 'USC Village -> LAX Terminal 3', 'USC Village Rideshare Zone', 'LAX Terminal 3 Departures', 4, 3, 10100, 8600, 1000, 600, 'HKD', '2026-06-04 08:00:00+00', null, null),
  ('10000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000101', 'SCHEDULED', 'COMPLETED', 'TAXI_METER', 'Tsim Sha Tsui -> Causeway Bay', 'Tsim Sha Tsui MTR Exit A1', 'Causeway Bay Times Square', 4, 3, 12000, 10000, 1000, 600, 'HKD', '2026-06-05 18:00:00+00', null, null),
  ('10000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000101', 'SCHEDULED', 'SETTLEMENT_PENDING', 'RIDE_APP_FIXED_QUOTE', 'USC Village -> LAX Terminal 3', 'USC Village Rideshare Zone', 'LAX Terminal 3 Departures', 4, 3, 10100, 8600, 1000, 600, 'HKD', '2026-06-06 08:00:00+00', null, null),
  ('10000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000101', 'SCHEDULED', 'DISPUTE_HOLD', 'RIDE_APP_FIXED_QUOTE', 'USC Village -> LAX Terminal 3', 'USC Village Rideshare Zone', 'LAX Terminal 3 Departures', 4, 3, 10100, 8600, 1000, 600, 'HKD', '2026-06-07 08:00:00+00', null, null),
  ('10000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000101', 'SCHEDULED', 'ADMIN_REVIEW', 'TAXI_METER', 'Tsim Sha Tsui -> Causeway Bay', 'Tsim Sha Tsui MTR Exit A1', 'Causeway Bay Times Square', 4, 3, 12000, 10000, 1000, 600, 'HKD', '2026-06-08 18:00:00+00', null, null),
  ('10000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000101', 'SCHEDULED', 'ADMIN_REVIEW', 'RIDE_APP_FIXED_QUOTE', 'USC Village -> LAX Terminal 3', 'USC Village Rideshare Zone', 'LAX Terminal 3 Departures', 4, 3, 10100, 8600, 1000, 600, 'HKD', '2026-06-09 08:00:00+00', null, null),
  ('10000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000101', 'RECURRING', 'LOCKED', 'RIDE_APP_FIXED_QUOTE', 'USC Village <-> LAX Terminal 3', 'USC Village Rideshare Zone', 'LAX Terminal 3 Departures', 4, 3, 10100, 8600, 1000, 600, 'HKD', null, array['TUE', 'THU'], 'BACK_AND_FORTH')
on conflict (id) do update set
  lifecycle_state = excluded.lifecycle_state,
  ride_option = excluded.ride_option,
  route_label = excluded.route_label,
  pickup_point = excluded.pickup_point,
  dropoff_point = excluded.dropoff_point,
  ideal_pod_size = excluded.ideal_pod_size,
  minimum_locked_guests = excluded.minimum_locked_guests,
  booking_fare_cap_cents = excluded.booking_fare_cap_cents,
  current_estimate_cents = excluded.current_estimate_cents,
  platform_fee_rate_bps = excluded.platform_fee_rate_bps,
  minimum_platform_fee_cents = excluded.minimum_platform_fee_cents,
  currency = excluded.currency,
  departure_at = excluded.departure_at,
  recurring_days = excluded.recurring_days,
  recurring_pattern = excluded.recurring_pattern,
  updated_at = now();

insert into pod_members (id, pod_id, user_id, role, member_state, max_charge_cents, final_charge_cents, locked_at)
select
  md5(pod_id::text || ':' || user_id::text)::uuid,
  pod_id,
  user_id,
  role,
  member_state,
  max_charge_cents,
  final_charge_cents,
  locked_at
from (
  values
    ('10000000-0000-4000-8000-000000000101'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz),
    ('10000000-0000-4000-8000-000000000102'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz),
    ('10000000-0000-4000-8000-000000000103'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz),
    ('10000000-0000-4000-8000-000000000104'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz),
    ('10000000-0000-4000-8000-000000000105'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz),
    ('10000000-0000-4000-8000-000000000106'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz),
    ('10000000-0000-4000-8000-000000000107'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz),
    ('10000000-0000-4000-8000-000000000108'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz),
    ('10000000-0000-4000-8000-000000000109'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'HOST', 'LOCKED'::member_state, null::int, null::int, '2026-06-01 12:00:00+00'::timestamptz)
) as host_rows(pod_id, user_id, role, member_state, max_charge_cents, final_charge_cents, locked_at)
union all
select
  md5(pod_id::text || ':' || user_id::text)::uuid,
  pod_id,
  user_id,
  'GUEST',
  'LOCKED'::member_state,
  max_charge_cents,
  null,
  '2026-06-01 12:15:00+00'::timestamptz
from (values
  ('10000000-0000-4000-8000-000000000101'::uuid, 10100),
  ('10000000-0000-4000-8000-000000000102'::uuid, 10100),
  ('10000000-0000-4000-8000-000000000103'::uuid, 10100),
  ('10000000-0000-4000-8000-000000000104'::uuid, 12000),
  ('10000000-0000-4000-8000-000000000105'::uuid, 10100),
  ('10000000-0000-4000-8000-000000000106'::uuid, 10100),
  ('10000000-0000-4000-8000-000000000107'::uuid, 12000),
  ('10000000-0000-4000-8000-000000000108'::uuid, 10100),
  ('10000000-0000-4000-8000-000000000109'::uuid, 10100)
) as pod_caps(pod_id, max_charge_cents)
cross join (values
  ('00000000-0000-4000-8000-000000000102'::uuid),
  ('00000000-0000-4000-8000-000000000103'::uuid),
  ('00000000-0000-4000-8000-000000000104'::uuid)
) as guests(user_id)
on conflict (id) do update set
  member_state = excluded.member_state,
  max_charge_cents = excluded.max_charge_cents,
  final_charge_cents = excluded.final_charge_cents,
  locked_at = excluded.locked_at;

insert into ride_instances (
  id,
  pod_id,
  instance_status,
  leg_type,
  route_label,
  departure_at,
  guests_locked_count,
  required_guests_count,
  booking_fare_cap_cents
)
values
  ('30000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', 'QUOTE_NEEDED', 'OUTBOUND', 'USC Village -> LAX Terminal 3', '2026-06-02 08:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000102', 'READY_TO_BOOK', 'OUTBOUND', 'USC Village -> LAX Terminal 3', '2026-06-03 08:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000103', 'RECEIPT_NEEDED', 'OUTBOUND', 'USC Village -> LAX Terminal 3', '2026-06-04 08:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000104', 'METER_PROOF_NEEDED', 'OUTBOUND', 'Tsim Sha Tsui -> Causeway Bay', '2026-06-05 18:00:00+00', 3, 3, 12000),
  ('30000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000105', 'SETTLEMENT_READY', 'OUTBOUND', 'USC Village -> LAX Terminal 3', '2026-06-06 08:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000106', '10000000-0000-4000-8000-000000000106', 'DISPUTE_REVIEW', 'OUTBOUND', 'USC Village -> LAX Terminal 3', '2026-06-07 08:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000107', '10000000-0000-4000-8000-000000000107', 'PROOF_UNDER_REVIEW', 'OUTBOUND', 'Tsim Sha Tsui -> Causeway Bay', '2026-06-08 18:00:00+00', 3, 3, 12000),
  ('30000000-0000-4000-8000-000000000108', '10000000-0000-4000-8000-000000000108', 'PROOF_UNDER_REVIEW', 'OUTBOUND', 'USC Village -> LAX Terminal 3', '2026-06-09 08:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000109', '10000000-0000-4000-8000-000000000109', 'QUOTE_NEEDED', 'OUTBOUND', 'USC Village -> LAX Terminal 3', '2026-06-02 08:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000110', '10000000-0000-4000-8000-000000000109', 'READY_TO_BOOK', 'RETURN', 'LAX Terminal 3 -> USC Village', '2026-06-02 18:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000111', '10000000-0000-4000-8000-000000000109', 'RIDE_BOOKED', 'OUTBOUND', 'USC Village -> LAX Terminal 3', '2026-06-04 08:00:00+00', 3, 3, 10100),
  ('30000000-0000-4000-8000-000000000112', '10000000-0000-4000-8000-000000000109', 'RECEIPT_NEEDED', 'RETURN', 'LAX Terminal 3 -> USC Village', '2026-06-04 18:00:00+00', 3, 3, 10100)
on conflict (id) do update set
  instance_status = excluded.instance_status,
  leg_type = excluded.leg_type,
  route_label = excluded.route_label,
  departure_at = excluded.departure_at,
  guests_locked_count = excluded.guests_locked_count,
  required_guests_count = excluded.required_guests_count,
  booking_fare_cap_cents = excluded.booking_fare_cap_cents,
  updated_at = now();

insert into proofs (
  id,
  ride_instance_id,
  uploaded_by_user_id,
  proof_type,
  proof_status,
  amount_cents,
  file_url,
  provider_name,
  certification_accepted,
  certification_text_version,
  submitted_at,
  reviewed_at,
  admin_notes
)
values
  ('40000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101', 'QUOTE_SCREENSHOT', 'VERIFIED', 9500, 'mock://proofs/ready-to-book/quote.png', 'Ride app demo', true, 'quote-cert-v1', '2026-06-02 20:00:00+00', '2026-06-02 20:15:00+00', 'Seed quote approved.'),
  ('40000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000101', 'QUOTE_SCREENSHOT', 'VERIFIED', 9500, 'mock://proofs/receipt-needed/quote.png', 'Ride app demo', true, 'quote-cert-v1', '2026-06-03 20:00:00+00', '2026-06-03 20:15:00+00', 'Seed quote approved before booked ride.'),
  ('40000000-0000-4000-8000-000000000105', '30000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000101', 'FINAL_RECEIPT', 'VERIFIED', 9800, 'mock://proofs/settlement-ready/receipt.png', 'Ride app demo', true, 'receipt-cert-v1', '2026-06-06 09:00:00+00', '2026-06-06 09:20:00+00', 'Seed receipt verified for settlement.'),
  ('40000000-0000-4000-8000-000000000106', '30000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000101', 'FINAL_RECEIPT', 'VERIFIED', 9800, 'mock://proofs/dispute-review/receipt.png', 'Ride app demo', true, 'receipt-cert-v1', '2026-06-07 09:00:00+00', '2026-06-07 09:15:00+00', 'Seed receipt reviewed before guest dispute.'),
  ('40000000-0000-4000-8000-000000000107', '30000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000101', 'METER_PROOF', 'UNDER_REVIEW', 15000, 'mock://proofs/above-cap/meter.jpg', 'Street taxi', true, 'meter-proof-cert-v1', '2026-06-08 19:00:00+00', null, 'Seed above-cap meter proof.'),
  ('40000000-0000-4000-8000-000000000108', '30000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000101', 'FINAL_RECEIPT', 'REJECTED', 13000, 'mock://proofs/replacement/old-receipt.png', 'Ride app demo', true, 'receipt-cert-v1', '2026-06-09 09:00:00+00', '2026-06-09 09:20:00+00', 'Old proof rejected; upload valid proof required.'),
  ('40000000-0000-4000-8000-000000000109', '30000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000101', 'FINAL_RECEIPT', 'SUBMITTED', 9800, 'mock://proofs/replacement/new-receipt.png', 'Ride app demo', true, 'receipt-cert-v1', '2026-06-09 10:00:00+00', null, 'Replacement proof submitted for review.'),
  ('40000000-0000-4000-8000-000000000110', '30000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000101', 'QUOTE_SCREENSHOT', 'VERIFIED', 9500, 'mock://proofs/recurring-return/quote.png', 'Ride app demo', true, 'quote-cert-v1', '2026-06-01 20:00:00+00', '2026-06-01 20:15:00+00', 'Recurring return quote approved.'),
  ('40000000-0000-4000-8000-000000000111', '30000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000101', 'QUOTE_SCREENSHOT', 'VERIFIED', 9500, 'mock://proofs/recurring-booked/quote.png', 'Ride app demo', true, 'quote-cert-v1', '2026-06-03 20:00:00+00', '2026-06-03 20:15:00+00', 'Recurring outbound quote approved.')
on conflict (id) do update set
  proof_status = excluded.proof_status,
  amount_cents = excluded.amount_cents,
  file_url = excluded.file_url,
  provider_name = excluded.provider_name,
  certification_accepted = excluded.certification_accepted,
  certification_text_version = excluded.certification_text_version,
  submitted_at = excluded.submitted_at,
  reviewed_at = excluded.reviewed_at,
  admin_notes = excluded.admin_notes;

insert into settlements (
  id,
  ride_instance_id,
  settlement_state,
  verified_fare_cents,
  booking_fare_cap_cents,
  billable_guest_count,
  fare_share_cents,
  platform_fee_cents,
  host_reimbursement_cents,
  dispute_deadline_at,
  finalized_at
)
values
  ('50000000-0000-4000-8000-000000000105', '30000000-0000-4000-8000-000000000105', 'DISPUTE_WINDOW', 9800, 10100, 3, 2450, 600, 7350, '2026-06-09 08:00:00+00', null),
  ('50000000-0000-4000-8000-000000000106', '30000000-0000-4000-8000-000000000106', 'DISPUTE_HOLD', 9800, 10100, 3, 2450, 600, 7350, '2026-06-10 08:00:00+00', null)
on conflict (id) do update set
  settlement_state = excluded.settlement_state,
  verified_fare_cents = excluded.verified_fare_cents,
  booking_fare_cap_cents = excluded.booking_fare_cap_cents,
  billable_guest_count = excluded.billable_guest_count,
  fare_share_cents = excluded.fare_share_cents,
  platform_fee_cents = excluded.platform_fee_cents,
  host_reimbursement_cents = excluded.host_reimbursement_cents,
  dispute_deadline_at = excluded.dispute_deadline_at,
  finalized_at = excluded.finalized_at;

insert into settlement_items (id, settlement_id, user_id, item_type, amount_cents, direction, reason)
values
  ('60000000-0000-4000-8000-000000000105', '50000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000101', 'HOST_REIMBURSEMENT', 7350, 'CREDIT', 'Verified receipt settlement.'),
  ('60000000-0000-4000-8000-000000000106', '50000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000101', 'HOST_REIMBURSEMENT', 7350, 'CREDIT', 'Dispute hold; reimbursement may be held.'),
  ('60000000-0000-4000-8000-000000000205', '50000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000102', 'GUEST_FINAL_CHARGE', 3050, 'DEBIT', 'Fare share plus platform fee.'),
  ('60000000-0000-4000-8000-000000000305', '50000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000103', 'GUEST_FINAL_CHARGE', 3050, 'DEBIT', 'Fare share plus platform fee.'),
  ('60000000-0000-4000-8000-000000000405', '50000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000104', 'GUEST_FINAL_CHARGE', 3050, 'DEBIT', 'Fare share plus platform fee.')
on conflict (id) do update set
  amount_cents = excluded.amount_cents,
  direction = excluded.direction,
  reason = excluded.reason;

update ride_instances set quote_proof_id = '40000000-0000-4000-8000-000000000102' where id = '30000000-0000-4000-8000-000000000102';
update ride_instances set quote_proof_id = '40000000-0000-4000-8000-000000000103' where id = '30000000-0000-4000-8000-000000000103';
update ride_instances set receipt_proof_id = '40000000-0000-4000-8000-000000000105', settlement_id = '50000000-0000-4000-8000-000000000105' where id = '30000000-0000-4000-8000-000000000105';
update ride_instances set receipt_proof_id = '40000000-0000-4000-8000-000000000106', settlement_id = '50000000-0000-4000-8000-000000000106' where id = '30000000-0000-4000-8000-000000000106';
update ride_instances set receipt_proof_id = '40000000-0000-4000-8000-000000000107' where id = '30000000-0000-4000-8000-000000000107';
update ride_instances set receipt_proof_id = '40000000-0000-4000-8000-000000000109' where id = '30000000-0000-4000-8000-000000000108';
update ride_instances set quote_proof_id = '40000000-0000-4000-8000-000000000110' where id = '30000000-0000-4000-8000-000000000110';
update ride_instances set quote_proof_id = '40000000-0000-4000-8000-000000000111' where id = '30000000-0000-4000-8000-000000000111';

insert into admin_review_cases (
  id,
  ride_instance_id,
  proof_id,
  settlement_id,
  review_state,
  case_type,
  severity,
  title,
  description,
  admin_notes
)
values
  ('70000000-0000-4000-8000-000000000106', '30000000-0000-4000-8000-000000000106', '40000000-0000-4000-8000-000000000106', '50000000-0000-4000-8000-000000000106', 'OPEN', 'GUEST_DISPUTE', 'HIGH', 'Guest dispute', 'Guest reports wrong route / wrong fare.', null),
  ('70000000-0000-4000-8000-000000000107', '30000000-0000-4000-8000-000000000107', '40000000-0000-4000-8000-000000000107', null, 'OPEN', 'METER_PROOF_ABOVE_CAP', 'HIGH', 'Meter proof above fare cap', 'Taxi meter proof is above the booking fare cap and needs manual review.', null),
  ('70000000-0000-4000-8000-000000000108', '30000000-0000-4000-8000-000000000108', '40000000-0000-4000-8000-000000000109', null, 'UNDER_REVIEW', 'RECEIPT_ABOVE_CAP', 'HIGH', 'Replacement receipt review', 'Replacement receipt history should remain visible for manual review.', 'Old proof remains evidence; do not delete old storage files.')
on conflict (id) do update set
  review_state = excluded.review_state,
  case_type = excluded.case_type,
  severity = excluded.severity,
  title = excluded.title,
  description = excluded.description,
  admin_notes = excluded.admin_notes;

insert into pod_events (id, pod_id, ride_instance_id, user_id, event_type, event_payload, created_at)
values
  ('80000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101', 'RIDE_INSTANCE_QUOTE_NEEDED', '{"reason":"Guests locked; fresh quote required before booking."}'::jsonb, '2026-06-01 12:30:00+00'),
  ('80000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000105', '30000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000101', 'SETTLEMENT_CREATED', '{"description":"Final split notice sent."}'::jsonb, '2026-06-06 09:30:00+00'),
  ('80000000-0000-4000-8000-000000000106', '10000000-0000-4000-8000-000000000106', '30000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000102', 'DISPUTE_REPORTED', '{"description":"Guest reports wrong route / wrong fare.","notes":"Guest says route included an unapproved extra stop."}'::jsonb, '2026-06-07 10:00:00+00'),
  ('80000000-0000-4000-8000-000000000107', '10000000-0000-4000-8000-000000000106', '30000000-0000-4000-8000-000000000106', null, 'PAYOUT_HELD', '{"description":"Payout held while RidePod reviews the dispute."}'::jsonb, '2026-06-07 10:05:00+00'),
  ('80000000-0000-4000-8000-000000000108', '10000000-0000-4000-8000-000000000108', '30000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000101', 'RECEIPT_UPLOADED', '{"description":"Old receipt proof uploaded.","fileUrl":"mock://proofs/replacement/old-receipt.png"}'::jsonb, '2026-06-09 09:00:00+00'),
  ('80000000-0000-4000-8000-000000000109', '10000000-0000-4000-8000-000000000108', '30000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000101', 'RECEIPT_UPLOADED', '{"description":"Replacement receipt proof uploaded.","fileUrl":"mock://proofs/replacement/new-receipt.png"}'::jsonb, '2026-06-09 10:00:00+00')
on conflict (id) do update set
  event_type = excluded.event_type,
  event_payload = excluded.event_payload,
  created_at = excluded.created_at;
