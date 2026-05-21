# RidePod Beta Event Tracking Plan

## 1. Tracking goal

Closed beta tracking should measure whether users understand, trust, and complete RidePod’s planned shared ride flows.

## 2. Core funnels

- Create Pod funnel
- Join / Lock Seat funnel
- Taxi Partner Quote funnel
- Proof / Receipt / Meter Proof funnel
- Settlement / Dispute funnel
- Admin Review funnel
- Profile / Eligibility funnel
- Safety Report funnel

## 3. Event naming convention

Use:

```text
ridepod_<area>_<action>
```

Examples:

- `ridepod_create_pod_started`
- `ridepod_taxi_partner_quote_requested`
- `ridepod_guest_quote_accepted`

## 4. Create Pod events

Events:

- `ridepod_create_pod_started`
- `ridepod_pod_type_selected`
- `ridepod_route_added`
- `ridepod_ride_option_selected`
- `ridepod_money_protection_viewed`
- `ridepod_create_pod_confirmed`
- `ridepod_create_pod_failed`

Properties:

- `podType`
- `rideOption`
- `routeType`
- `taxiType`
- `recurringPattern`
- `safetyMode`
- `demoMode`

## 5. Join / Lock Seat events

Events:

- `ridepod_join_started`
- `ridepod_eligibility_checked`
- `ridepod_eligibility_failed`
- `ridepod_max_charge_viewed`
- `ridepod_seat_locked`
- `ridepod_join_failed`

Properties:

- `eligibilityResult`
- `blockingReason`
- `maxChargeCents`
- `safetyMode`
- `accessMode`

## 6. Taxi Partner Quote events

Events:

- `ridepod_taxi_partner_option_viewed`
- `ridepod_taxi_partner_quote_requested`
- `ridepod_taxi_partner_quote_submitted`
- `ridepod_taxi_partner_quote_received`
- `ridepod_guest_quote_viewed`
- `ridepod_guest_quote_accepted`
- `ridepod_guest_quote_declined`
- `ridepod_partner_job_accepted`
- `ridepod_partner_job_declined`
- `ridepod_partner_marked_arrived`
- `ridepod_partner_started_ride`
- `ridepod_partner_completed_ride`
- `ridepod_taxi_partner_payout_pending`

Properties:

- `quoteAmountCents`
- `taxiType`
- `guestCount`
- `platformFeeCents`
- `guestChargeCents`
- `quoteAboveCap`
- `demoMode`

## 7. Proof / settlement events

- `ridepod_quote_uploaded`
- `ridepod_receipt_uploaded`
- `ridepod_meter_proof_uploaded`
- `ridepod_proof_under_review`
- `ridepod_proof_approved`
- `ridepod_proof_rejected`
- `ridepod_settlement_viewed`
- `ridepod_dispute_window_viewed`
- `ridepod_dispute_reported`
- `ridepod_payout_held`
- `ridepod_payout_ready`

## 8. Admin Review events

- `ridepod_admin_review_opened`
- `ridepod_admin_case_viewed`
- `ridepod_admin_proof_approved`
- `ridepod_admin_more_info_requested`
- `ridepod_admin_proof_rejected`
- `ridepod_admin_payout_held`
- `ridepod_admin_payout_ready`
- `ridepod_admin_dispute_resolved`

## 9. Profile / safety events

- `ridepod_profile_viewed`
- `ridepod_profile_saved`
- `ridepod_id_review_requested`
- `ridepod_public_profile_viewed`
- `ridepod_member_report_started`
- `ridepod_member_report_submitted`

## 10. Metrics to calculate

- Pod creation completion rate
- Join completion rate
- Eligibility failure rate
- Taxi partner quote acceptance rate
- Guest quote decline rate
- Proof upload completion rate
- Dispute rate
- Admin review rate
- Payout hold rate
- Report concern rate
- Confusion points by screen

## 11. Privacy rules

Do not track:

- Phone numbers
- Email addresses
- Gender identity
- ID details
- Exact private addresses unless required and consented
- Card details
- Client secrets
- Admin notes text
- Safety report text

Use IDs and categories instead of sensitive content.

## 12. Beta dashboard idea

Dashboard cards:

- Active pods
- Quote requests
- Guest acceptance rate
- Disputes
- Admin review queue
- Drop-off points
- Most confusing screens

## 13. Implementation note

No tracking code is added in this slice. This is a plan for future implementation.
