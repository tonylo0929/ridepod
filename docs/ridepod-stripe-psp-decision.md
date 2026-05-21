# RidePod Stripe / PSP Decision

Payment readiness note: RidePod is not live-payment ready. Current payment flows are mock/test mode only. Live payments and payouts require legal, payment provider, security, ops, and partner readiness review.

## 1. Decision Summary

Decision options:
- Stripe PaymentIntents only
- Stripe Connect marketplace model
- FPS / PayMe / manual payout model
- Hybrid model
- No live payments yet

Recommended default:

No live payments yet. Use mock payment state until legal, taxi partner, and payment ops are validated.

Next safe step is Stripe test mode proof of concept, not live payment.

## 2. RidePod Payment Use Cases

RidePod needs payment architecture for:

1. Guest max authorization
2. Guest quote acceptance
3. Platform fee collection
4. Host reimbursement
5. Taxi partner payout
6. Payout hold during dispute window
7. Refund / release on cancellation
8. Chargeback / dispute evidence
9. Recurring ride instance payment
10. Admin hold / release / deny payout control

## 3. Payment Modes To Compare

### A. Stripe PaymentIntents Only

Description:

RidePod charges guests but handles host/taxi partner payout manually outside Stripe Connect.

Pros:
- simpler first payment test
- easier to test guest quote acceptance
- no connected account onboarding yet

Cons:
- manual payouts
- ops burden
- harder marketplace compliance
- reconciliation needed

Best use:

Early test mode only.

### B. Stripe Connect

Description:

RidePod acts as platform and pays taxi partners / hosts through connected accounts.

Pros:
- marketplace payout flow
- platform fee support
- connected account onboarding
- payout tracking

Cons:
- more compliance
- dispute/negative balance responsibility may affect platform
- Connect fees
- partner onboarding friction

Best use:

Future taxi partner quote live pilot.

### C. FPS / PayMe / Manual Transfer

Description:

RidePod collects payment or asks users to pay through local rails manually.

Pros:
- familiar in Hong Kong
- may avoid some card costs
- good for manual early ops

Cons:
- weaker automation
- harder refund/dispute automation
- less clean user experience
- manual reconciliation
- may not support authorization/hold

Best use:

Manual pilot / partner testing only.

### D. Hybrid

Description:

Use Stripe card payments for guest charges, but manual/FPS payouts to taxi partners in early pilot.

Pros:
- guest-side smoother
- partner payout can remain manual
- lower implementation complexity than full Connect

Cons:
- accounting/reconciliation burden
- payout trust issue
- manual ops
- compliance review needed

Best use:

Controlled small pilot.

### E. No Live Payments Yet

Description:

Keep mock payment state for beta.

Pros:
- lowest legal/payment risk
- fastest usability testing
- no chargeback risk
- no payout obligation

Cons:
- cannot validate actual payment willingness
- cannot test real fee economics

Best use:

Current closed beta.

## 4. Comparison Table

| Option | Guest payment UX | Payout support | Dispute handling | Refund handling | Ops burden | Compliance burden | Best stage | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PaymentIntents only | Clean guest card/test flow | Manual outside Connect | Platform/admin must manage | Possible, but payout remains manual | Medium | Medium | Early test mode | Good first POC, not enough for payout automation |
| Stripe Connect | Clean marketplace flow | Strong connected-account support | Better platform tooling, still operationally complex | Stronger tooling | Medium-high | High | Future live pilot | Evaluate after legal/payment review |
| FPS / PayMe manual | Familiar local transfer UX | Manual transfer | Mostly manual | Manual | High | Medium | Manual pilot | Useful for controlled operations only |
| Hybrid card + manual payout | Good guest-side UX | Manual/FPS payout | Mixed tooling/manual review | Mixed | Medium-high | Medium-high | Controlled small pilot | Possible if legal/payment review allows |
| Mock only | No real payment friction | None | Demo-only | Demo-only | Low | Low | Current closed beta | Recommended now |

## 5. Recommended Staged Decision

Phase 0:

Mock payment state only.

Phase 1:

Stripe test mode PaymentIntent for guest quote acceptance.

Phase 2:

Admin-controlled capture/refund simulation.

Phase 3:

Taxi partner payout architecture decision.

Phase 4:

Stripe Connect test mode or manual payout pilot.

Phase 5:

Live payment pilot only after legal/payment review.

Do not build live payment before PAY-2 test mode POC and legal review.

## 6. Stripe PaymentIntents Option

Possible flow:

1. Guest accepts quote.
2. RidePod creates PaymentIntent in test mode.
3. PaymentIntent amount = guest charge.
4. PaymentIntent uses manual capture if appropriate.
5. Ride completes.
6. Dispute window/admin review clears.
7. Capture or cancel/refund depending outcome.

Considerations:
- authorization expiry
- scheduled ride timing
- failed capture
- partial capture/refund
- card dispute evidence
- recurring ride reauthorization

Recommendation:

Good first test-mode POC for guest quote acceptance, not enough for payout automation.

## 7. Stripe Connect Option

Possible future connected accounts:
- taxi partners / fleets
- possibly hosts if host reimbursement remains

Possible architecture:
- destination charges
- separate charges and transfers
- direct charges

Recommendation:

Evaluate separate charges and transfers or delayed-transfer model because RidePod needs payout hold and dispute window control.

Considerations:
- connected account onboarding
- platform fee
- payout timing
- disputes
- negative balances
- tax/reporting
- country/capability availability
- taxi partner legal status

## 8. FPS / PayMe / Manual Option

FPS supports real-time transfers in Hong Kong through participating banks and stored-value facilities.

Possible use:
- manual taxi partner payout
- manual host reimbursement
- small controlled pilot

Limitations:
- no card-style authorization hold
- manual reconciliation
- manual refund handling
- weaker in-app proof of payment unless integrated
- support burden

Recommendation:

Useful for manual pilot payout, not ideal for fully automated RidePod protection.

## 9. Hybrid Option

Definition:

Guest pays by Stripe card / test mode first. Taxi partner payout handled manually/FPS during pilot.

Pros:
- easier than full Connect
- preserves guest in-app payment UX
- lets RidePod test willingness to pay

Cons:
- manual reconciliation
- payout trust risk
- operational errors
- compliance review still needed

Recommendation:

Possible first live pilot model if legal/payment review allows.

## 10. Unit Economics / Fee Risk

Current fee model:

```text
platformFeeCents = max(
  ceil(fareShareCents * 10%),
  HK$6
)
```

Explanation:
- small fares need HK$6 minimum to cover payment/support risk
- card processing and dispute fees can make small transactions unprofitable
- taxi partner quote mode may need higher minimum fee or cap

Example:
- Taxi quote: HK$240
- Guests: 4
- Fare share: HK$60
- Platform fee: HK$6 per guest
- Platform fee total: HK$24
- Taxi partner payout: HK$240

If card fees, dispute fees, refunds, and support time exceed fee revenue, RidePod should adjust platform fee before live launch.

## 11. Dispute / Chargeback Considerations

Evidence package:
- quote shown
- user acceptance
- payment authorization timestamp
- ride instance timeline
- taxi partner quote
- guest acceptance state
- completion event
- dispute window notice
- report issue notes
- admin decision
- proof/receipt/meter proof if applicable
- chat/update logs if available

Risk:
- cardholder disputes can still happen even if in-app dispute window passes
- platform may bear fees/costs depending architecture
- manual ops needed

## 12. Cancellation / Refund Decision Matrix

| Scenario | Suggested payment result |
| --- | --- |
| Guest cancels before taxi partner accepts | Release/cancel authorization or no charge. |
| Guest cancels after taxi partner accepts | Possible cancellation fee / admin rule. |
| Taxi partner cancels | Release guest payments / request new quote. |
| Taxi partner no-show | Refund/release guests, deny/hold partner payout. |
| Guest no-show | Charge may apply if seat committed and ride proceeds. |
| Ride completed, no dispute | Capture/release payout after dispute window. |
| Ride completed, dispute raised | Hold payout until admin review. |

Final policy needs legal/payment review.

## 13. Recommended Decision

Recommendation:

1. Keep closed beta mock-only.
2. Build PAY-2 Stripe test mode POC next.
3. Do not implement live Stripe Connect yet.
4. Do not collect live taxi partner payout details yet.
5. Use payment strategy to validate guest quote acceptance first.
6. Decide Connect/manual payout only after taxi partner conversations.

Decision:

PAY-1 recommendation: No live payments yet. Proceed to Stripe test mode POC only.

## 14. Next PAY Slices

- PAY-2 — Stripe test mode PaymentIntent POC
- PAY-3 — Guest quote acceptance payment test mode
- PAY-4 — Admin capture/cancel/refund simulation
- PAY-5 — Taxi partner payout architecture POC
- PAY-6 — Dispute/chargeback evidence package
- PAY-7 — Legal/payment readiness gate
