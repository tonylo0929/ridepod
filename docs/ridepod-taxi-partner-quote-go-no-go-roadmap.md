# Taxi Partner Quote Mode — Go / No-Go Review

Payment readiness note: RidePod is not live-payment ready. Current payment flows are mock/test mode only. Live payments and payouts require legal, payment provider, security, ops, and partner readiness review.

## 1. Decision Summary

Recommended decision: **GO as demo-only beta prototype**.

Decision options:

| Option | Decision | Meaning |
| --- | --- | --- |
| GO as demo-only beta prototype | Recommended | Keep testing the mock Taxi Partner Quote workflow with clear beta limits. |
| GO WITH LIMITATIONS for partner exploration | Conditional | Use the prototype to speak with licensed taxi partners and validate operating assumptions. |
| NO-GO for live operation | Required for now | Do not operate this as a live taxi dispatch, payment, or payout product yet. |

Taxi Partner Quote is promising as RidePod's future main business direction, but live operation requires taxi partner, legal, insurance, payment, and payout review.

## 2. Product Positioning

RidePod groups compatible riders first, then helps them request one shared quote from a licensed taxi partner.

RidePod does not provide drivers. Taxi partners are external licensed providers.

Taxi Partner Quote Mode is currently a future beta prototype. No real taxi dispatch, payment, or payout is enabled unless explicitly stated.

## 3. Why This Mode Matters

Taxi Partner Quote Mode matters because it can:

- Avoid the host fake screenshot problem by moving toward partner-provided quotes.
- Reduce rider refusal after ride by asking guests to accept the shared pod quote before the ride proceeds.
- Remove the host paying first in the future live model.
- Create a cleaner quote, accept, completion, dispute window, and payout pending flow.
- Support shared taxi cost saving with a clear per-guest breakdown.
- Support scheduled and recurring booking patterns.
- Support women-only, verified-only, community-only, high-trust-only, and invite-only pods.
- Support taxi type selection.
- Support luggage and accessibility matching when the taxi partner supports it.
- Create a better monetization path through a visible platform fee.

## 4. Current Demo Flow

Current Taxi Partner Quote beta flow:

1. Organizer creates shared taxi pod.
2. Guests join and lock.
3. Organizer selects Taxi partner quote.
4. Organizer selects taxi type.
5. Organizer requests quote.
6. Demo Taxi Partner quote appears.
7. Guests accept quote.
8. Mock payment state is recorded.
9. Ride becomes Ready for taxi partner.
10. Ride is marked completed in demo.
11. Dispute window opens.
12. Payout becomes pending.
13. Guest can report issue.
14. Admin can hold, release, or deny payout in demo.
15. Updates and statuses reflect the state.

This flow is demo/mock only.

## 5. Go Criteria For Demo

Taxi Partner Quote is demo-ready if:

- Ride option card exists.
- Future beta limitation is clear.
- Request quote flow opens.
- Mock quote can be simulated.
- Quote breakdown is correct.
- Guest acceptance works.
- Mock payment state is clear.
- All guests accepted leads to Ready for taxi partner.
- Completion mock starts dispute window.
- Payout pending state is clear.
- Dispute report works.
- Admin review cases show correctly.
- Updates and statuses sync correctly.
- No real payment or payout wording appears.
- No wording presents taxi partners as RidePod-provided drivers.
- Professional Blue design is applied consistently.
- App builds successfully.

## 6. No-Go Criteria For Live Operation

Taxi Partner Quote must not go live if any of these remain:

- No licensed taxi partner agreement.
- No legal/regulatory review.
- No insurance/liability review.
- No payment authorization/capture setup.
- No payout architecture.
- No dispute/refund policy.
- No driver/partner onboarding process.
- No partner verification process.
- No cancellation/no-show rules.
- No support/admin ops process.
- No terms/privacy/safety policy.
- No production RLS/security review.
- No storage/privacy review.
- No real customer support workflow.

## 7. Current Limitations

Current limitations:

- No real taxi dispatch.
- No real taxi partner account.
- No real driver dashboard.
- No real payment.
- No real payout.
- No Stripe Connect.
- No taxi API.
- No GPS tracking.
- No live pickup sharing.
- No OCR.
- No AI fraud detection.
- No automatic dispute resolution.
- No legal/compliance signoff.

## 8. Money Model

Demo money model:

```text
driverQuoteCents = quote amount

guestCount = accepted guest count

fareShareCents = ceil(driverQuoteCents / guestCount)

platformFeeCents = max(
  ceil(fareShareCents * 10%),
  HK$6
)

guestChargeCents = fareShareCents + platformFeeCents

platformFeeTotalCents = platformFeeCents * guestCount

taxiPartnerPayoutCents = driverQuoteCents
```

Example:

| Item | Amount |
| --- | ---: |
| Taxi partner quote | HK$240 |
| Guests | 4 |
| Fare share | HK$60 |
| Platform fee | HK$6 per guest |
| Guest pays | HK$66 |
| RidePod earns | HK$24 |
| Taxi partner payout | HK$240 |

No real payment or payout is enabled in beta.

## 9. Operational Risks

| Risk | Severity | Why it matters | Current demo mitigation | Future live requirement |
| --- | --- | --- | --- | --- |
| Taxi partner quotes too high | High | Guests may reject the quote or lose trust. | Above-cap warning and admin review mock. | Partner pricing rules, quote caps, and transparent guest approval. |
| Guests decline quote | Medium | Ride may not proceed after quote is received. | Decline state and organizer retry copy. | Cancellation policy and re-quote workflow. |
| Taxi partner no-show | High | Guests may be stranded and support load rises. | Dispute option and payout hold mock. | Partner SLA, support playbook, and no-show penalties. |
| Wrong pickup point | Medium | Pickup friction can cause missed rides. | Dispute option and manual review. | Pickup confirmation, partner instructions, and support escalation. |
| Wrong route | Medium | Guests may dispute fairness or safety. | Completion dispute mapping. | Route policy, support evidence, and partner review. |
| Guest claims they did not take ride | High | Payment and payout disputes become sensitive. | High-severity completion dispute mock. | Identity, attendance, refund, and evidence policy. |
| Unsafe / inappropriate behavior | High | Safety concerns require careful handling. | Safety concern case and manual review copy. | Safety escalation process, partner accountability, and privacy controls. |
| Accessibility request not supported | Medium | Guests may be unable to use the ride. | Copy says support depends on taxi partner. | Partner capability registry and availability checks. |
| Luggage mismatch | Medium | Wrong vehicle size can break the trip. | Luggage count in request mock. | Vehicle fit rules and partner confirmation. |
| Payout dispute | High | Money movement requires robust controls. | Payout held/release/deny mock actions. | Payment ledger, payout holds, dispute policy, and audit trail. |
| Chargeback | High | Platform can lose money and trust. | No real payment in beta. | Payment risk controls, evidence, and refund handling. |
| Regulatory issue | High | Live operation may require licenses or approvals. | Future beta limitation copy. | Jurisdiction-specific legal review. |
| Insurance/liability issue | High | Liability must be clear before live rides. | Demo-only limitation. | Insurance review and contractual coverage. |
| Off-app contact/payment leakage | Medium | Users or partners may bypass RidePod. | No live partner accounts yet. | Terms, monitoring, support process, and partner agreements. |
| Admin workload too high | Medium | Manual review may not scale. | Mock queue and status mapping. | Ops tooling, triage rules, and staffing model. |

## 10. Taxi Type Roadmap

Current/future taxi types:

- Standard taxi.
- Electric taxi.
- Luggage-friendly taxi.
- Large taxi / van.
- Comfort taxi.
- Accessible taxi.

Accessibility and special vehicle requests are available only when supported by the taxi partner.

## 11. Safety Mode Roadmap

Supported pod matching modes:

- Women-only.
- Mixed pod.
- Verified-only.
- Community-only.
- High-trust-only.
- Invite-only.

Women-only controls who can join the shared pod. It does not guarantee a female taxi driver unless supported by the taxi partner.

## 12. Roadmap

### Phase 1 — Current demo

- Taxi Partner Quote mock flow.
- Demo quote.
- Mock guest acceptance.
- Mock payout pending.
- Admin review mock.

### Phase 2 — Partner discovery

- Speak with licensed taxi drivers / fleets.
- Validate quote workflow.
- Validate taxi type support.
- Validate luggage/accessibility support.
- Validate driver payout expectation.

### Phase 3 — Taxi partner dashboard prototype

- Partner sees pod request.
- Partner submits quote.
- Partner accepts assignment.
- Partner marks completed.
- Payout pending view.

### Phase 4 — Payment/payout test mode

- Stripe test mode or local PSP test.
- Authorization/capture design.
- Payout hold/release design.
- Refund/dispute ops.

### Phase 5 — Limited live pilot

- Small number of licensed taxi partners.
- Manual admin review.
- Manual support.
- Limited routes/use cases.
- Clear terms.

### Phase 6 — Scale

- Partner fleet onboarding.
- Live GPS/pickup visibility.
- Recurring partner quote flows.
- Stronger safety/eligibility gates.
- Analytics and ops dashboard.

## 13. Next Build Slices

Recommended next Codex slices:

1. TAXI-PARTNER-1 — Taxi partner dashboard mock.
2. TAXI-PARTNER-2 — Partner quote submission mock.
3. TAXI-PARTNER-3 — Partner assignment / accept job mock.
4. TAXI-PARTNER-4 — Partner completion / payout view mock.
5. TAXI-PARTNER-5 — Partner dispute/admin review integration.
6. PAY-0 — Payment architecture strategy.
7. LEGAL-0 — Regulatory / terms / risk review checklist.

Do not build live payments before PAY-0 and legal review.

## 14. Final Recommendation

Recommendation: keep Taxi Partner Quote as a demo-only beta prototype for now. It should become RidePod's future main business direction only after partner, legal, payment, payout, and ops validation.

Decision: **GO as demo-only beta prototype**.

Next action: Build Taxi Partner Dashboard mock only if Taxi Partner Quote demo passes tester feedback.
