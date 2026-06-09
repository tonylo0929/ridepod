# RidePod Business Model and Fee Rules

RidePod uses a two-mode revenue model: Ride app self-settle pods use a fixed RidePod join fee, while Taxi Partner Quote pods use a RidePod fee based on the accepted taxi partner quote.

Current implementation is mock/demo only. No live payment, live billing, real payout, or real taxi dispatch is enabled in this version.

## 1. Business Model Summary

| Product mode | RidePod role | User payment | RidePod revenue | Current status |
| --- | --- | --- | --- | --- |
| Ride app self-settle | Group matching, chat, booking-detail coordination. | Ride fare is paid outside RidePod. | HK$5 RidePod join fee when a rider confirms ride details. | Mock/demo only. No live payment. |
| Taxi Partner Quote | Group formation, taxi partner quote, guest acceptance, quote/review states. | Riders pay fare share plus RidePod fee in future live model. | 10% of rider fare share, minimum HK$6 per rider by default. | Mock/demo only. No live payment or payout. |
| RidePod Plus | Membership preview with convenience benefits. | Future monthly subscription. | Future monthly membership fee. | Preview/mock only. No live subscription. |
| Optional support | Founder/project support. | Optional coffee/support contribution. | Optional support only. | Separate from ride fees. |

## 2. Core Fee Rules

### Host Creates Free

Hosts can create Taxi pods and Ride app self-settle pods for free by default.

| Fee | Default |
| --- | --- |
| Taxi pod host create fee | HK$0 |
| Ride app self-settle host create fee | HK$0 |

Free creation helps grow pod supply and reduces host friction.

### Joiners Pay RidePod Fee

RidePod fees apply when a rider joins an eligible pod, not when a host creates a pod.

For Ride app self-settle pods, initial Join pod is interest / seat hold only. The RidePod fee is demo-confirmed or waived when a rider confirms ride details, not at initial interest join.

Reconfirming updated self-settle details does not create a second RidePod fee for the same pod.

If a self-settle rider misses the confirm-by deadline before confirming ride details, no RidePod fee is demo-confirmed and no waiver is consumed.

### Ride Fares Are Separate

RidePod fees do not include taxi fare, taxi partner quote, ride app fare, tips, or external payments.

## 3. Ride App Self-Settle Model

Ride app self-settle means:

- RidePod helps riders find and chat with people going the same way.
- The external ride app booking happens outside RidePod.
- The fare split is handled directly by pod members.
- Fare estimate screenshot is optional, local/mock-only first, and not verified by RidePod.
- Ride app fare screenshots are optional context only. RidePod does not verify ride app screenshots.
- No receipt proof is required.
- No fare protection is provided.
- No live payment is taken in this version.

Revenue rule:

```text
RidePod join fee = HK$5 per rider who confirms ride details
```

Fee source:

```text
ridePodPricingConfig.joinFees.rideAppSelfSettle
```

Default config:

```text
type = fixed
fixedAmountCents = 500
```

Host creation rule:

```text
ridePodPricingConfig.hostCreateFees.rideAppSelfSettle = disabled
```

User-facing copy rules:

- Use "Free to create."
- Use "RidePod join fee."
- Use "Confirm ride details."
- Use "RidePod does not verify ride app screenshots."
- Use "Ride fare is paid outside RidePod."
- Use "No live payment is taken."
- Do not imply RidePod books the ride app.
- Do not call screenshots proof, verified fare, or receipt.
- Do not imply the host pays HK$5 on creation.

TODO: `docs/ridepod-flow-mode-matrix.md` is not present. If that matrix is added later, note that rider join is interest / seat hold and final confirmation happens after host shares details.

## 4. Taxi Partner Quote Model

Taxi Partner Quote means:

- RidePod helps form the rider group.
- The host or organizer requests a taxi partner quote.
- Guests review and accept the taxi partner quote in mock/demo state.
- RidePod shows quote, acceptance, review, and completion states.
- No real taxi dispatch is enabled in this version.
- No live payment or payout is enabled in this version.

Revenue rule:

```text
fareShareCents = ceil(taxiPartnerQuoteCents / acceptedRiderCount)
ridePodFeeCents = max(ceil(fareShareCents * 10%), HK$6)
riderTotalCents = fareShareCents + ridePodFeeCents
```

Fee source:

```text
ridePodPricingConfig.joinFees.taxiPod
```

Default config:

```text
type = percentage_with_minimum
percentageBps = 1000
minimumAmountCents = 600
```

Example:

```text
Taxi partner quote = HK$240
Accepted rider count = 4
Fare share = HK$60
RidePod fee = HK$6
Your total = HK$66
```

Taxi partner fee rule:

```text
ridePodPricingConfig.taxiPartnerFees.quoteCommission = disabled
```

RidePod does not deduct anything from the taxi partner quote in the current mock/demo model.

## 5. RidePod Plus Model

RidePod Plus is currently a preview/mock membership.

Current preview benefits include monthly HK$5 RidePod join fee waivers. These waivers apply only to eligible RidePod join fees.

Plus does not cover:

- Taxi partner quotes
- Taxi fares
- Ride app fares
- Tips
- External payments
- Refund guarantees
- Fare protection

Future revenue model:

```text
RidePod Plus monthly membership fee
```

Current status:

```text
Preview/mock only. No live subscription or payment is taken.
```

## 6. Waiver Rules

Waivers reduce or waive RidePod fees only.

Waivers do not reduce:

- Taxi partner quote
- Taxi fare
- Ride app fare
- Tips
- External payments

Default waiver config:

```text
launchWaiverEnabled = true
launchWaiverMaxClaims = 100
plusWaiversEnabled = true
plusMonthlyWaiverCount = 5
```

Waiver precedence:

```text
1. Launch waiver
2. RidePod Plus waiver
3. Normal RidePod fee
```

Ride app self-settle waiver display:

```text
RidePod fee: HK$5 waived
Helper: Ride fare is paid outside RidePod.
```

Taxi waiver display:

```text
RidePod fee before waiver: calculated from fare share
Waiver: applied to RidePod fee only
Taxi partner quote: unchanged
```

## 7. Optional Support Model

Support RidePod / coffee support is separate from ride fees.

It should be treated as optional founder/project support, not ride payment, not taxi fare, not ride app fare, and not a required fee to create or join a pod.

Suggested positioning:

```text
Optional support only. Separate from ride fees.
```

## 8. Current Mock Pricing Config

The current centralized mock pricing config lives in:

```text
src/lib/ridepod-pricing.ts
```

Important default rules:

```text
hostCreateFees.taxi = disabled
hostCreateFees.rideAppSelfSettle = disabled
joinFees.rideAppSelfSettle = fixed HK$5
joinFees.taxiPod = 10% of fare share, minimum HK$6
taxiPartnerFees.quoteCommission = disabled
```

Current user-facing displays should use the shared helpers where safe:

```text
calculateRidePodFee
calculateRideAppJoinFee
calculateTaxiRiderPlatformFee
formatHKD
ridePodPricingConfig
```

## 9. Product Copy Rules

Use:

- RidePod fee
- RidePod join fee
- Fare share
- Your total
- Taxi partner quote
- Taxi partner quote is separate
- Ride fare is paid outside RidePod
- Ride fare is not included
- Waivers apply only to the RidePod fee
- No live payment is taken
- Free to create

Avoid:

- Driver fee
- Deduct from driver
- Fare markup
- Taxi fare waived
- Ride app fare waived
- Free ride
- Pay now
- Payment completed
- Real payment captured
- Billing started
- Payout sent
- Escrow
- Protected payment for Ride app
- Guaranteed refund
- Guaranteed fare

## 10. Implementation Boundaries

This business model document describes the current mock/demo implementation and intended fee logic. It does not introduce:

- Backend pricing persistence
- Live payment
- Stripe changes
- Real invoice or receipt flow
- Taxi partner payout deduction
- Real waiver redemption backend
- Wallet or balance system
- Taxi APIs
- GPS

## 11. Founder Notes

The current model favors growth and clarity:

- Hosts create for free to encourage pod supply.
- Ride app self-settle stays lightweight with a simple fixed RidePod join fee.
- Taxi Partner Quote uses a fee tied to accepted rider fare share.
- Waivers and Plus benefits reduce only RidePod fees, not transport costs.
- All live money movement remains disabled until legal, payment ops, support, and partner workflows are ready.
