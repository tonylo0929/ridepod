# RidePod Money Protection + Safety Mode QA Checklist

RidePod is not a ride-hailing company and does not provide drivers. Hosts book external rides outside RidePod; QA should verify that RidePod locks seats, gates safety access, manages quote/receipt evidence, discourages off-app payment, and calculates protected reimbursement correctly.

## Safety Eligibility

- [ ] Women-only pod allows an eligible verified female user.
- [ ] Women-only pod blocks non-eligible users.
- [ ] Women-only pod requires gender verification when required by the profile model.
- [ ] Mixed pod allows eligible users regardless of gender identity.
- [ ] Verified-only pod blocks unverified users.
- [ ] Community-only pod blocks users from the wrong community.
- [ ] High-trust-only pod blocks users below the trust threshold.
- [ ] Invite-only pod blocks users without a valid invite.
- [ ] Suspended users are always blocked.
- [ ] Restricted users are blocked from protected pods.

## Money Lock

- [ ] Interested/requested user is not confirmed.
- [ ] Join request sets `PAYMENT_REQUIRED` and `PAYMENT_METHOD_REQUIRED`.
- [ ] Payment authorization sets user to confirmed/authorized.
- [ ] Pod moves to payment locking when some but not enough seats are authorized.
- [ ] Pod locks when required authorized seats are reached.
- [ ] Payment authorization alone does not set `HOST_CAN_BOOK`.
- [ ] Chat and exact pickup remain locked for unconfirmed users.

## Quote / Booking

- [ ] Host can upload quote screenshot before riders confirm.
- [ ] Quote screenshot alone does not allow protected booking.
- [ ] Non-host cannot upload quote.
- [ ] Quote above approved max requires approval and blocks booking.
- [ ] Fresh approved quote plus required authorized participants enables protected booking.
- [ ] Booking before permission is blocked or clearly marked unprotected.
- [ ] Successful protected booking moves pod to ride booked state.

## Host Replacement

- [ ] Host cancel before booking keeps pod active.
- [ ] Confirmed participants remain locked temporarily.
- [ ] Confirmed eligible rider can become replacement host.
- [ ] Unconfirmed participant cannot become replacement host.
- [ ] Suspended or restricted participant cannot become replacement host.
- [ ] Old host quote cannot be reused by replacement host.
- [ ] Replacement host must upload fresh quote before protected booking.

## Cancellation / No-Show

- [ ] Cancel before payment lock is not billable.
- [ ] Cancel after hard lock but before host booking is not fare-billable by default.
- [ ] Cancel after host booking is billable only if the seat is not replaced.
- [ ] Replaced seat removes original participant fare billability.
- [ ] Host-fault cancellation is not billable for the rider.
- [ ] No-show after booking is billable only if the seat is not replaced.
- [ ] Non-host cannot mark a participant as no-show.

## Receipt / Settlement

- [ ] Settlement cannot calculate before verified receipt.
- [ ] Final settlement uses verified receipt, not quote screenshot.
- [ ] Receipt lower than quote uses receipt amount.
- [ ] Receipt above approved max caps eligible fare at approved max.
- [ ] Rider final charge does not exceed `maxChargeCents`.
- [ ] Deterministic rounding is stable by member order.
- [ ] Host reimbursement excludes over-approved-max amount.
- [ ] Fraud suspected receipt moves pod to admin review.
- [ ] No billable members triggers admin review or error.

## Chat / Off-App

- [ ] Unconfirmed user cannot access chat.
- [ ] Confirmed/payment-authorized user can access chat.
- [ ] Exact pickup is hidden for unconfirmed users.
- [ ] Exact pickup is visible for confirmed users.
- [ ] “Venmo me” triggers off-app payment warning.
- [ ] “Zelle me” triggers off-app payment warning.
- [ ] “PayPal” triggers off-app payment warning.
- [ ] Phone number plus payment wording triggers warning.
- [ ] Normal pickup coordination does not trigger warning.
- [ ] Warning shows “Keep payment in RidePod” and “Send anyway”.

## UI Smoke Test

- [ ] Create Pod shows Money Protection fields.
- [ ] Create Pod shows Women-only / Mixed pod and access mode controls.
- [ ] Join Flow shows eligibility before payment.
- [ ] Join Flow shows max charge and authorization CTA.
- [ ] Pod cards show safety, access, and money status badges.
- [ ] Pod Detail shows timeline and money lock status.
- [ ] Host Dashboard separates quote preview from protected booking permission.
- [ ] Host Replacement screen shows replacement mode copy and actions.
- [ ] Settlement / Receipt screen shows receipt status and final split.
- [ ] Chat UI shows lock notice and off-app warning banner.
