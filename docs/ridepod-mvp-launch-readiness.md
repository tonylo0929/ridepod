# RidePod MVP Launch Readiness Checklist

Internal checklist and risk register for deciding whether RidePod is ready for closed beta testing.

## 1. MVP Scope

- Scheduled one-time pods.
- Recurring pods as weekly ride templates.
- Ride app / fixed quote mode.
- Taxi meter mode.
- Taxi partner quote mode as future beta prototype only.
- Seat lock and max charge per guest concept.
- Quote proof before protected booking for ride app / fixed quote.
- Meter proof after ride for taxi meter.
- Verified receipt settlement.
- Dispute window after final split notice.
- Admin review queue for proof, disputes, above-cap fares, and payout holds.
- Updates / notifications page.
- How RidePod Works page.

## 2. Not Included Yet

- Real Stripe production payments.
- Real payouts.
- OCR.
- AI receipt detection.
- Uber, DiDi, or Lyft APIs.
- TaxiFareFinder API.
- Real route optimization.
- Native mobile app.
- Recurring billing.
- Insurance or legal automation.

## Taxi Partner Quote Mode Direction

| Mode | Meaning | Proof | Status |
| --- | --- | --- | --- |
| Ride app / fixed quote | Host/organizer books through an app or provider that shows fare before booking. | Fresh quote before booking. Final receipt after ride. | Current beta / proof-based mode. |
| Taxi meter | Host/organizer takes a real street taxi with a meter. | No upfront quote. Meter proof or taxi receipt after ride. | Current beta / meter-proof mode. |
| Taxi partner quote | Licensed taxi partner quotes one shared pod price. | Partner quote before guests accept. Completion plus dispute window before payout. | Future beta prototype / no real dispatch or payout yet. |

Taxi Partner Quote flow: organizer creates shared taxi pod, guests join and lock, organizer selects taxi type and luggage/accessibility needs, licensed taxi partner submits quote, guests accept quote, mock payment state is recorded, ride is marked completed, dispute window opens, payout becomes pending, admin review handles issues, and no issue means payout ready in a future/live version.

Money model: `fareShareCents = ceil(driverQuoteCents / guestCount)`, `platformFeeCents = max(ceil(fareShareCents * 10%), HK$6)`, `guestChargeCents = fareShareCents + platformFeeCents`, and `driverPayoutCents = driverQuoteCents`. Example: HK$240 quote / 4 guests = HK$60 fare share, HK$6 platform fee, HK$66 guest pays, HK$24 RidePod earns, HK$240 taxi partner payout. No real payment or payout is enabled in beta unless explicitly stated.

Taxi type options: standard, electric, luggage-friendly, large taxi / van, comfort, and accessible. Accessibility or special vehicle requests are available only if supported by the taxi partner.

Safety/access note: Women-only controls who can join the shared pod. It does not guarantee a female taxi driver unless supported by the taxi partner. Verified-only, community-only, high-trust-only, and invite-only remain rider access controls.

Taxi Partner Quote risks: quotes too high, guests decline, taxi partner no-show, pickup issue, guest dispute, payout held during review, unsupported accessibility request, safety report, and licensing/payment review needed. Use licensed taxi partners/fleets first; legal, licensing, insurance, and payment/payout review are required before live operation.

Recommendation: keep current closed beta flows, but treat Taxi Partner Quote Mode as the future main business direction to test with licensed taxi partners.

## 3. Core Product Rules

- RidePod does not provide drivers.
- Host books or takes the external ride.
- Quote controls booking permission.
- Verified receipt or meter proof controls final settlement.
- Guests cannot be charged above max unless they approve more.
- Each recurring ride instance settles separately.
- Off-app payments are not protected.
- Silent guests do not block settlement forever; the dispute window auto-settles when no issue is reported.

## 4. Manual Operations Required

- Suspicious proof review.
- Above-cap fare review.
- Fake receipt suspicion review.
- Guest disputes.
- Host cancellation after booking.
- No-show disputes.
- Payout or reimbursement approval while real money movement is not automated.

## 5. Risk Register

| Risk | Severity | What can go wrong | Current mitigation | Manual fallback | Future improvement |
| --- | --- | --- | --- | --- | --- |
| Fake receipt / AI image | High | Host submits altered or generated proof to increase reimbursement. | Certification checkbox, warning copy, proof status, admin review queue. | Hold payout, request more info, reject proof, restrict account if needed. | OCR, metadata checks, fraud signals, provider verification. |
| Host uploads wrong proof | High | Proof belongs to another ride or wrong date/time. | Per-ride instance upload screens and certification text. | Admin compares proof, route, time, quote, and receipt. | Structured upload metadata and automated mismatch checks. |
| Guest disputes final split | High | Guest says fare, route, or participation is wrong. | Dispute window and settlement details screen. | Admin review and payout hold during dispute. | Dispute workflow with evidence timeline and role-specific views. |
| Guest no-show | Medium | Guest locks a seat but does not ride, causing split disagreement. | Manual dispute category and admin review support. | Review chat, timing, and host/guest evidence. | No-show policy, check-in, and pickup confirmation. |
| Host cancels after booking | High | Host cancels external ride after guests lock or after booking. | Admin review case type and payout hold. | Hold payout, notify guests, resolve case manually. | Cancellation policy automation and replacement host flow. |
| Off-app payment leakage | High | Host asks guests to pay outside RidePod, bypassing protection. | Product copy says off-app payments are not protected. | Manual review, account action, support intervention. | In-app payment enforcement and suspicious message detection. |
| Stripe processing cost | Medium | Small rides become uneconomical after payment costs. | Platform fee has 10% rule with HK$6 minimum. | Adjust beta pricing manually before launch expansion. | Fee analytics and dynamic pricing model. |
| Chargebacks | High | Guest disputes card charge after settlement. | Max charge concept, proof trail, dispute window. | Manual evidence package and payout hold if needed. | Stripe dispute automation and evidence exports. |
| Authorization expiry | High | Guest payment authorization expires before booking or settlement. | MVP models seat lock and max charge but does not run real payments yet. | Re-authorize manually in beta payment operations. | Automated authorization refresh and expiry alerts. |
| Taxi meter fare higher than cap | Medium | Meter fare exceeds booking fare cap and guests cannot be charged above max. | Above-cap warning, meter proof review, admin queue. | Cap reimbursement or request higher max approval. | Pre-ride cap education and smarter taxi buffer. |
| Recurring ride exception handling | Medium | Time, route, or stop changes after lock create confusion. | Recurring protection copy and exception rules. | Host/admin manually notifies guests and requests approval. | Full exception engine with per-instance change approvals. |
| Legal / ride-hailing classification risk | Critical | RidePod may be mistaken for a ride-hailing provider. | Copy states RidePod does not provide drivers and host books externally. | Manual copy review before beta communications. | Legal review and jurisdiction-specific terms. |
| Safety incident | Critical | Incident occurs during an externally booked ride. | RidePod positions itself as coordination and payment protection, not transportation provider. | Escalate to support, emergency guidance, manual account action. | Safety reporting flow, emergency resources, trust tooling. |
| Admin workload | Medium | Manual review volume overwhelms the team. | Admin review queue and clear status categories. | Limit closed beta size and triage high-severity cases first. | Admin automation, review SLAs, and risk scoring. |

## 6. Closed Beta Readiness Checklist

- [ ] How RidePod Works page is visible.
- [ ] Scheduled ride app flow opens.
- [ ] Scheduled taxi meter flow opens.
- [ ] Recurring setup opens.
- [ ] My Pods status dashboard opens.
- [ ] Updates page opens.
- [ ] Quote upload flow opens.
- [ ] Receipt upload flow opens.
- [ ] Meter proof upload flow opens.
- [ ] Settlement screen opens.
- [ ] Dispute report flow opens.
- [ ] Admin review queue opens.
- [ ] Risky wording removed.
- [ ] No production payment promise.
- [ ] No wording that presents taxi partners as RidePod-operated drivers.
- [ ] No "guaranteed refund" wording.
- [ ] No absolute safety wording.
- [ ] Manual review path exists.

## 7. Beta Test Scenarios

### A. Scheduled Ride App / Fixed Quote

What tester does:
- Creates a scheduled one-time pod.
- Selects Ride app / fixed quote.
- Sets route, seats, and money protection values.
- Creates the pod, locks guests, uploads a fresh quote, marks booked, completes ride, uploads receipt, and checks settlement.

What should happen:
- No quote is required during pod creation.
- Quote is required before protected booking.
- Receipt is required after ride.
- Settlement uses verified receipt and shows a dispute window.

What to observe:
- Whether host understands when proof is needed.
- Whether guests understand max charge per guest.
- Whether the flow avoids provider-integration confusion.

### B. Scheduled Taxi Meter

What tester does:
- Creates a scheduled one-time pod.
- Selects Taxi meter.
- Reviews booking fare cap, locks guests, completes ride, uploads meter proof, and checks settlement.

What should happen:
- No upfront quote is requested.
- Meter proof or taxi receipt is required after ride.
- Settlement uses verified meter proof or taxi receipt.

What to observe:
- Whether taxi meter copy is clear.
- Whether guests understand that meter fare can vary but max charge is protected.
- Whether host understands meter proof requirements.

### C. Recurring Back-and-Forth Ride

What tester does:
- Creates a recurring weekly pod.
- Selects repeat days, start date, end rule, flexibility, and back-and-forth.
- Sets outbound and return times.
- Reviews recurring template and creates the pod.

What should happen:
- Return route defaults to reverse route.
- Each ride date is described as protected separately.
- My Pods shows recurring card, next ride, and instance statuses.

What to observe:
- Whether recurring template vs ride instance is understandable.
- Whether users expect each ride to have separate proof and settlement.
- Whether exception rules are clear enough for beta.

### D. Host Cancellation Before Booking

What tester does:
- Creates a pod, locks guests, then simulates host cancellation before external booking.

What should happen:
- Guests should not be treated as having completed a protected ride.
- Admin review or support path should be available if there is confusion.
- No payout should be implied before verified proof.

What to observe:
- Whether status copy clearly separates locked seats from booked ride.
- Whether notifications and My Pods avoid promising settlement too early.

### E. Dispute / Suspicious Receipt

What tester does:
- Uploads a receipt or meter proof that is suspicious, unclear, or above cap.
- Opens settlement details and reports an issue during the dispute window.
- Reviews the case in Admin Review.

What should happen:
- Case enters manual review or payout hold.
- Admin can request more info, reject proof, cap reimbursement, hold payout, release payout, or resolve dispute.
- No copy claims proof is guaranteed real.

What to observe:
- Whether manual review copy feels trustworthy but not over-promising.
- Whether admin notes and decision copy are clear.
- Whether dispute window timing is understandable.

## 8. Founder Notes

RidePod MVP should prove whether users understand and trust the protected pod flow before automating payments or provider integrations.
