-- RidePod MVP seed data.
-- Seed records are intentionally deterministic so local sanity queries are repeatable.

insert into profiles (id, display_name, email)
values
  ('00000000-0000-4000-8000-000000000001', 'Maya Host', 'maya.host@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'Tony Guest', 'tony.guest@example.test'),
  ('00000000-0000-4000-8000-000000000003', 'Avery Guest', 'avery.guest@example.test'),
  ('00000000-0000-4000-8000-000000000004', 'Jordan Guest', 'jordan.guest@example.test')
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
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'SCHEDULED',
    'FORMING',
    'RIDE_APP_FIXED_QUOTE',
    'USC Village -> LAX Terminal 3',
    'USC Village Rideshare Zone',
    'LAX Terminal 3 Departures',
    4,
    3,
    32000,
    29800,
    1000,
    600,
    'HKD',
    '2026-05-19 08:00:00+00',
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'SCHEDULED',
    'LOCKED',
    'TAXI_METER',
    'USC Village -> LAX Terminal 3',
    'USC Village Rideshare Zone',
    'LAX Terminal 3 Departures',
    4,
    3,
    32000,
    29800,
    1000,
    600,
    'HKD',
    '2026-05-20 08:00:00+00',
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'RECURRING',
    'FORMING',
    'RIDE_APP_FIXED_QUOTE',
    'USC Village <-> LAX Terminal 3',
    'USC Village Rideshare Zone',
    'LAX Terminal 3 Departures',
    4,
    3,
    32000,
    29800,
    1000,
    600,
    'HKD',
    null,
    array['TUE', 'THU'],
    'BACK_AND_FORTH'
  )
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
  recurring_days = excluded.recurring_days,
  recurring_pattern = excluded.recurring_pattern,
  updated_at = now();

insert into pod_members (id, pod_id, user_id, role, member_state, max_charge_cents, final_charge_cents, locked_at)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'HOST', 'LOCKED', null, null, '2026-05-18 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'GUEST', 'LOCKED', 9500, null, '2026-05-18 12:05:00+00'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'GUEST', 'LOCKED', 9500, null, '2026-05-18 12:10:00+00'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 'GUEST', 'LOCKED', 9500, null, '2026-05-18 12:15:00+00'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'GUEST', 'AUTHORIZED', 9500, null, null),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'GUEST', 'LOCKED', 9500, null, '2026-05-19 12:00:00+00')
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
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'QUOTE_NEEDED',
    'OUTBOUND',
    'USC Village -> LAX Terminal 3',
    '2026-05-19 08:00:00+00',
    3,
    3,
    32000
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'METER_PROOF_NEEDED',
    'OUTBOUND',
    'USC Village -> LAX Terminal 3',
    '2026-05-20 08:00:00+00',
    3,
    3,
    32000
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'QUOTE_NEEDED',
    'OUTBOUND',
    'USC Village -> LAX Terminal 3',
    '2026-05-26 08:00:00+00',
    3,
    3,
    32000
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000003',
    'READY_TO_BOOK',
    'OUTBOUND',
    'USC Village -> LAX Terminal 3',
    '2026-05-28 08:00:00+00',
    3,
    3,
    32000
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000003',
    'SETTLEMENT_READY',
    'RETURN',
    'LAX Terminal 3 -> USC Village',
    '2026-05-28 18:00:00+00',
    3,
    3,
    32000
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000003',
    'RIDE_BOOKED',
    'OUTBOUND',
    'USC Village -> LAX Terminal 3',
    '2026-06-02 08:00:00+00',
    3,
    3,
    32000
  )
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
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    'QUOTE_SCREENSHOT',
    'VERIFIED',
    29800,
    'mock://proofs/quote-ready-to-book.png',
    'Ride app demo',
    true,
    'quote-cert-v1',
    '2026-05-27 20:00:00+00',
    '2026-05-27 20:15:00+00',
    'Seed quote verified.'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    'FINAL_RECEIPT',
    'VERIFIED',
    29800,
    'mock://proofs/final-receipt.png',
    'Ride app demo',
    true,
    'receipt-cert-v1',
    '2026-05-28 19:00:00+00',
    '2026-05-28 19:30:00+00',
    'Seed receipt verified.'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'METER_PROOF',
    'UNDER_REVIEW',
    33800,
    'mock://proofs/meter-proof-above-cap.png',
    'Street taxi',
    true,
    'meter-proof-cert-v1',
    '2026-05-20 09:30:00+00',
    null,
    'Seed above-cap meter proof for admin review.'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    'QUOTE_SCREENSHOT',
    'VERIFIED',
    29800,
    'mock://proofs/quote-booked-ride.png',
    'Ride app demo',
    true,
    'quote-cert-v1',
    '2026-06-01 20:00:00+00',
    '2026-06-01 20:10:00+00',
    'Seed quote verified before booking.'
  )
on conflict (id) do update set
  proof_status = excluded.proof_status,
  amount_cents = excluded.amount_cents,
  file_url = excluded.file_url,
  provider_name = excluded.provider_name,
  certification_accepted = excluded.certification_accepted,
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
  (
    '50000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000005',
    'DISPUTE_WINDOW',
    29800,
    32000,
    4,
    7450,
    745,
    26820,
    '2026-05-31 18:00:00+00',
    null
  )
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
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'GUEST_FINAL_CHARGE', 8195, 'DEBIT', 'Fare share plus platform fee.'),
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'GUEST_FINAL_CHARGE', 8195, 'DEBIT', 'Fare share plus platform fee.'),
  ('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'GUEST_FINAL_CHARGE', 8195, 'DEBIT', 'Fare share plus platform fee.'),
  ('60000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'HOST_REIMBURSEMENT', 26820, 'CREDIT', 'Verified receipt settlement.')
on conflict (id) do update set
  amount_cents = excluded.amount_cents,
  direction = excluded.direction,
  reason = excluded.reason;

update ride_instances
set quote_proof_id = '40000000-0000-4000-8000-000000000001'
where id = '30000000-0000-4000-8000-000000000004';

update ride_instances
set receipt_proof_id = '40000000-0000-4000-8000-000000000002',
    settlement_id = '50000000-0000-4000-8000-000000000001'
where id = '30000000-0000-4000-8000-000000000005';

update ride_instances
set receipt_proof_id = '40000000-0000-4000-8000-000000000003'
where id = '30000000-0000-4000-8000-000000000002';

update ride_instances
set quote_proof_id = '40000000-0000-4000-8000-000000000004'
where id = '30000000-0000-4000-8000-000000000006';

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
  (
    '70000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000003',
    null,
    'OPEN',
    'METER_PROOF_ABOVE_CAP',
    'HIGH',
    'Meter proof above booking fare cap',
    'Seed case: taxi meter proof amount is above the booking fare cap and needs manual review.',
    null
  )
on conflict (id) do update set
  review_state = excluded.review_state,
  case_type = excluded.case_type,
  severity = excluded.severity,
  title = excluded.title,
  description = excluded.description,
  admin_notes = excluded.admin_notes;

insert into pod_events (id, pod_id, ride_instance_id, user_id, event_type, event_payload)
values
  (
    '80000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'RIDE_INSTANCE_QUOTE_NEEDED',
    '{"reason":"Guests locked; fresh quote required before booking."}'::jsonb
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'ADMIN_REVIEW_OPENED',
    '{"reason":"Meter proof above booking fare cap."}'::jsonb
  )
on conflict (id) do update set
  event_type = excluded.event_type,
  event_payload = excluded.event_payload;
