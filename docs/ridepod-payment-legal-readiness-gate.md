# RidePod Payment / Legal Readiness Gate

Payment readiness note: RidePod is not live-payment ready. Current payment flows are mock/test mode only. Live payments and payouts require legal, payment provider, security, ops, and partner readiness review.

## 1. Decision Summary

Decision options:

- GO for test mode only
- GO for limited live pilot
- NO-GO for live money

Recommended current decision:

GO for test mode only. NO-GO for live money.

Reason:

- Taxi Partner Quote is still demo/beta.
- Real payments, refunds, chargebacks, and payouts require legal/payment/ops review.
- Taxi partner operations require partner/legal/regulatory review.

## 2. What Is Allowed Now

Allowed:

- Mock payment state
- Stripe test mode PaymentIntents
- Stripe test card confirmation
- Admin capture/cancel/refund simulation
- Payment event audit trail
- Evidence package generation
- Internal beta demo

Not allowed:

- Live card charges
- Live Stripe Connect payouts
- Real taxi partner payout
- Stored payment methods for recurring rides
- Automated refunds
- Production payment capture
- Production dispute automation

## 3. Live Payment No-Go Conditions

Live payments must not launch if any condition is true:

- No legal review
- No terms of service
- No privacy policy
- No cancellation/refund policy
- No dispute policy
- No taxi partner agreement
- No payment provider compliance review
- No clear merchant-of-record decision
- No chargeback handling process
- No admin ops workflow
- No secure webhook handling
- No production RLS/security review
- No service-role/payment secret audit
- No proof/evidence retention policy
- No payout accounting/reconciliation process

## 4. Mode-Specific Readiness

| Mode | Live payment readiness | Blockers |
| --- | --- | --- |
| Ride app / fixed quote | NO-GO | Host reimbursement rules, receipt verification, chargeback handling, refund/cancel policy |
| Taxi meter | NO-GO | Meter proof review, fare above cap policy, cancellation/no-show, refund ops |
| Taxi partner quote | NO-GO | Licensed partner agreement, payout architecture, taxi legal review, partner cancellation/no-show, dispute ops |

## 5. Legal / Regulatory Checklist

- [ ] RidePod role defined: platform / coordinator / marketplace / agent?
- [ ] Taxi partner role defined as external provider.
- [ ] "RidePod does not provide drivers" wording reviewed.
- [ ] Taxi partner licensing requirements reviewed.
- [ ] Insurance/liability allocation reviewed.
- [ ] Passenger safety responsibilities reviewed.
- [ ] Cancellation/no-show rules reviewed.
- [ ] Refund/dispute policy reviewed.
- [ ] Payment terms reviewed.
- [ ] Data privacy policy reviewed.
- [ ] Proof/evidence retention reviewed.
- [ ] Admin review/account action policy reviewed.
- [ ] Accessibility request wording reviewed.
- [ ] Women-only / eligibility wording reviewed.
- [ ] Emergency disclaimer reviewed.

## 6. Payment Compliance Checklist

- [ ] Stripe account/payment provider approved for use case.
- [ ] Merchant of record decided.
- [ ] PaymentIntent/capture flow reviewed.
- [ ] Stripe Connect vs manual payout decided.
- [ ] Tax/receipt/invoice handling reviewed.
- [ ] Chargeback fees and economics reviewed.
- [ ] Refund policy implemented.
- [ ] Payout schedule implemented.
- [ ] Payout holds implemented.
- [ ] Negative balance/dispute responsibility understood.
- [ ] Webhooks implemented server-side.
- [ ] Payment secrets server-only.
- [ ] Client never receives secret key.
- [ ] No live key in source code.
- [ ] Audit trail implemented.
- [ ] Evidence package implemented.

## 7. Operational Readiness Checklist

- [ ] Admin review queue staffed.
- [ ] Proof review SOP exists.
- [ ] Dispute review SOP exists.
- [ ] Chargeback response SOP exists.
- [ ] Safety report SOP exists.
- [ ] Taxi partner support SOP exists.
- [ ] Rider support SOP exists.
- [ ] Cancellation/no-show SOP exists.
- [ ] Payout hold/release SOP exists.
- [ ] Escalation process exists.
- [ ] Beta issue tracker exists.

## 8. Security / Privacy Readiness

- [ ] RLS policies tested.
- [ ] Storage bucket private.
- [ ] Signed URL access tested.
- [ ] Service role not exposed.
- [ ] Payment secret not exposed.
- [ ] Client secret not logged/stored.
- [ ] Admin route protected.
- [ ] Proof files not public.
- [ ] Safety reports private.
- [ ] Public profile excludes private fields.
- [ ] Audit logs do not contain secrets.
- [ ] Evidence package sanitizes sensitive fields.

## 9. Money Economics Readiness

Current platform fee:

```text
max(10% of fare share, HK$6)
```

Questions before live:

- Does fee cover card processing?
- Does fee cover dispute fee risk?
- Does fee cover support/admin time?
- Does small fare make sense?
- Is HK$6 minimum enough?
- What happens if chargeback fee exceeds platform fee?
- Should taxi partner quote mode have higher minimum fee?
- Should admin-reviewed payouts incur fee?

## 10. Live Pilot Requirements

Before limited live pilot:

Required:

- Legal review done
- Payment provider decision made
- Stripe test mode POC passed
- Taxi partner agreement signed
- Refund/cancel rules written
- Admin SOP ready
- Support channel ready
- Beta testers understand limitations
- Live key deployment process secure
- Monitoring/logging ready
- Go/no-go meeting completed

Pilot constraints:

- Small number of users
- Small number of taxi partners
- Limited routes
- Payment caps
- Manual payout review
- No automatic payout release
- Daily ops review

## 11. Recommended Decision

Current decision: GO for test mode only. NO-GO for live payment or taxi partner payout.

Next steps:

1. Keep mock/test payment in beta.
2. Complete UI review.
3. Run tester sessions.
4. Gather willingness-to-pay feedback.
5. Speak with taxi partners.
6. Complete legal/payment review.
7. Only then consider limited live pilot.

## 12. Next Build Slices

- UI-REVIEW-1 — Full current RidePod UI review
- BETA-TEST-1 — Run first tester session
- PARTNER-DISCOVERY-1 — Taxi partner interview tracker
- LEGAL-1 — Terms/privacy/safety policy draft for counsel
- PAY-8 — Stripe webhook test mode plan
- PAY-9 — Payment ledger schema design
- PILOT-0 — Limited live pilot plan
