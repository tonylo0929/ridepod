# RidePod Payment Architecture Strategy

## 1. Payment Positioning

RidePod payment architecture should protect guests, hosts/organizers, and taxi partners without promising guaranteed refunds or guaranteed payouts.

Closed beta uses mock payment states. Real payment authorization, capture, refund, and payout are not enabled unless explicitly stated.

RidePod has three payment-relevant ride modes:

| Mode | Payment positioning |
| --- | --- |
| Ride app / fixed quote | Host/organizer books externally. RidePod may later authorize guest max charges. Host reimbursement is based on verified receipt. |
| Taxi meter | No upfront quote. RidePod may later authorize guest max charge from taxi baseline/fare cap. Final settlement uses meter proof or taxi receipt. |
| Taxi partner quote | Licensed taxi partner quotes one shared pod price. Guests accept/pay or authorize quote. Taxi partner payout is released after completion and dispute window/manual review. |

## 2. Core Payment Principles

1. No real charge before clear user acceptance.
2. Guests must see max charge / quote before money is authorized.
3. Guests cannot be charged above approved max unless they approve an increase.
4. Host/taxi partner should not be paid immediately on self-declared completion.
5. Dispute window comes before payout release.
6. Suspicious/above-cap cases go to admin review.
7. Off-app payments are not protected.
8. Platform fee must cover payment processing, support, and dispute risk.
9. No payout guarantee until payment/dispute systems are live and reviewed.
10. No service-role/payment secrets in client code.

## 3. Recommended Future Payment Stack

Primary recommendation:

Stripe PaymentIntents + Stripe Connect in test mode first.

Possible account model:
- Stripe Connect Express for taxi partners / providers, subject to legal/compliance review.
- Platform collects application fee.
- Payouts delayed until completion + dispute window.

Exact Connect charge type should be decided in PAY-1 after legal/payment review.

Possible charge models:

| Model | How it works | Fit for RidePod |
| --- | --- | --- |
| Destination charge | Platform creates charge, transfers to connected account, and collects application fee. | Useful for marketplace-style payment, but platform may have dispute/fee responsibilities. |
| Separate charges and transfers | Platform charges guests and later transfers to taxi partner/host. | More control over delayed payout, with more operational responsibility. |
| Direct charge | Connected account is merchant of record. | Less platform control and may not fit RidePod dispute/payout control. |

Recommendation:

For RidePod’s early taxi partner quote model, separate charges and transfers or delayed-transfer marketplace architecture may fit better than immediate transfer, because RidePod needs dispute window and payout hold control.

## 4. Payment Flow By Mode

| Mode | User payment | Capture | Recipient | Risk | Beta status |
| --- | --- | --- | --- | --- | --- |
| Ride app / fixed quote | Guest authorizes max charge before host books. | After verified receipt and dispute window. | Host reimbursement. | Host fake receipt / receipt mismatch / above-cap fare. | Mock only. |
| Taxi meter | Guest authorizes max based on taxi baseline / fare cap. | After verified meter proof and dispute window. | Host reimbursement or future taxi partner. | Meter fare above cap / no receipt / dispute. | Mock only. |
| Taxi partner quote | Guest accepts quote and authorizes/pays quote share + platform fee. | Before assignment or at ride start depending future decision. | Taxi partner payout after completion + dispute window. | Partner no-show / rider dispute / chargeback / payout hold. | Mock only. |

## 5. Taxi Partner Quote Future Payment Flow

Recommended future flow:

1. Organizer creates pod.
2. Guests join.
3. Taxi partner quotes HK$Q.
4. RidePod shows fare share, platform fee, guest total, and quote expiry.
5. Guests accept quote.
6. RidePod creates payment authorization or collects payment in test/live mode.
7. When required guests accept/pay, taxi partner can accept job.
8. Taxi partner completes ride.
9. Dispute window opens.
10. If no dispute / admin clear, capture/release payout according to chosen payment architecture.
11. If dispute, hold payout and route to admin review.

Driver/taxi partner must not receive payout just by clicking Finish.

## 6. Authorization Vs Capture Decision

### Option A — Authorize First, Capture Later

Pros:
- protects guest max cap
- avoids charging if ride cancels
- supports dispute before capture

Cons:
- card authorization windows expire
- scheduled/recurring rides may require reauthorization
- failed capture risk

### Option B — Capture Upfront, Refund/Release Later

Pros:
- stronger commitment
- avoids auth expiry
- protects taxi partner availability

Cons:
- refund/dispute support needed
- user trust friction
- payment processing costs happen earlier

### Option C — Small Deposit + Later Capture

Pros:
- lower friction
- anti-ghosting

Cons:
- does not fully protect host/taxi partner
- final payment still needed

Recommendation:
- Near-term scheduled rides: authorization or upfront capture in test mode only after acceptance.
- Far-future/recurring rides: small commitment / reauthorization near ride date.
- Taxi partner quote: require guest acceptance and payment authorization before partner accepts final job.

## 7. Authorization Window / Recurring Risk

Payment authorization windows may expire before future scheduled or recurring rides. RidePod should not rely on one long authorization for far-future rides.

Recommended rule:
- same-day / near-term rides: authorization can be considered
- future rides: deposit or reauthorization near ride date
- recurring rides: each ride instance needs its own payment state

Each recurring ride date should authorize/capture separately.

## 8. Platform Fee Model

Current model:

```text
platformFeeCents = max(
  ceil(fareShareCents * 10%),
  HK$6
)
```

Why this model exists:
- 10% aligns platform revenue with ride size.
- HK$6 minimum helps cover payment processing and support cost on small transactions.
- Fee may need adjustment after Stripe/PSP cost testing.

Example:
- Taxi partner quote: HK$240
- Guests: 4
- Fare share: HK$60
- Platform fee: HK$6 per guest
- Guest pays: HK$66
- Platform fee total: HK$24
- Taxi partner payout: HK$240

Stripe HK dispute fees and card processing costs can make small transactions unprofitable if fees are too low. This should be reviewed before live launch.

## 9. Dispute / Chargeback Risk

User dispute types:
- did not take ride
- wrong pickup
- wrong route
- unsafe behavior
- fare/quote mismatch
- taxi partner no-show
- host/organizer issue
- duplicate charge

Payment dispute / chargeback risk:
- cardholder may dispute with bank
- platform may bear fees/costs depending payment architecture
- evidence package required

RidePod evidence package:
- user acceptance timestamp
- max charge / quote shown
- quote acceptance checkbox
- mock/real payment authorization
- ride instance timeline
- taxi partner quote
- completion event
- dispute window notice
- chat/update logs
- proof/receipt/meter proof if applicable
- admin review decision

## 10. Refund / Cancellation Rules

Future refund matrix:

| Timing/event | Future policy direction |
| --- | --- |
| Before taxi partner accepts | Guest can cancel with low/no penalty depending policy. No payout. |
| After taxi partner accepts but before pickup | Cancellation may incur fee if partner already committed. |
| After ride starts | Refund only through dispute/admin review. |
| Taxi partner no-show | Guest should not be charged or should be refunded. Partner payout denied/held. |
| Guest no-show | Guest may be charged if seat was committed and ride proceeded. |
| Organizer cancels | Guests released/refunded depending timing. Partner compensation depends on acceptance/cancellation policy. |

These rules require legal/payment review before live launch.

## 11. Payout Policy

Future payout states:
- NOT_READY
- PENDING_DISPUTE_WINDOW
- HELD_FOR_REVIEW
- READY_TO_RELEASE
- RELEASED
- DENIED

Rule:

Payout should only move to READY_TO_RELEASE after completion + dispute window + admin review clear.

Taxi partner payout:
- equals accepted quote amount unless adjusted by admin/legal policy
- not reduced by RidePod platform fee in current model
- platform fee paid by guests

Host reimbursement:
- based on verified receipt/meter proof
- capped by approved max unless higher amount approved

## 12. Admin Review Payment Controls

Admin can:
- hold payout
- request more info
- approve proof/settlement
- reject proof
- deny payout in demo/future policy
- mark payout ready
- resolve dispute

Admin must not:
- silently charge above max
- release payout before dispute window if unresolved
- claim fraud confirmed without review
- promise guaranteed refund/payout

## 13. Security / Compliance Requirements

Before live payment:
- legal review
- terms of service
- privacy policy
- refund/cancellation policy
- dispute policy
- taxi partner agreement
- payment provider compliance review
- KYC/onboarding for partners
- secure webhook handling
- server-side payment intent creation
- no payment secrets in browser
- RLS/security review
- audit logs
- evidence retention policy

## 14. What Not To Build Yet

Do not build until PAY-1/PAY-2:
- production Stripe payments
- production Stripe Connect payouts
- wallet/balance system
- automatic refunds
- automatic payout release
- stored payment methods for recurring rides
- instant payout
- OCR/AI fraud decisioning
- real taxi partner onboarding

## 15. Recommended Payment Roadmap

PAY-1 — Stripe / PSP decision doc
- compare Stripe Connect, local PSP, FPS/PayMe/manual options
- decide charge model

PAY-2 — Stripe test mode proof of concept
- PaymentIntent test mode
- no live money

PAY-3 — Guest quote acceptance payment test
- accept quote
- create test payment intent
- mock capture/hold

PAY-4 — Taxi partner Connect account test
- onboarding in test mode
- no real payout

PAY-5 — Payout hold/release test
- test transfer/payout states
- admin hold/release

PAY-6 — Refund/dispute simulation
- test chargeback/refund states
- evidence package

PAY-7 — Legal/payment readiness gate
- decide whether live beta is allowed

## 16. Recommendation

Recommendation: do not add live payments yet. Keep Taxi Partner Quote as mock-only until partner, legal, payment, payout, and dispute operations are validated.

Next safe step: build PAY-1 decision doc and Stripe/local PSP comparison before any payment code.


## PAY-2 Test Mode POC Note

PAY-2 adds a Stripe test mode PaymentIntent creation proof of concept for Taxi Partner Quote guest acceptance.

This POC is test mode only:
- no live payment
- no Stripe Connect
- no taxi partner payout
- no card confirmation yet
- no capture/release payout logic

The API is disabled unless `RIDEPOD_ENABLE_STRIPE_TEST_MODE=true`, `STRIPE_SECRET_KEY` starts with `sk_test_`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_test_`.

Card confirmation / Stripe Elements remains PAY-3.
