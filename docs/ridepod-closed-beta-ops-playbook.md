# RidePod Closed Beta Ops Playbook

Audience: founder, admin reviewer, support/operator, and beta test coordinator.

This playbook is for running RidePod closed beta tests safely. It is operational, manual-first, and clear about what is demo-only.

## 1. Closed Beta Operating Principle

Closed beta is for testing user understanding, trust, and workflow. It is not full production financial automation.

Use closed beta to learn whether testers understand RidePod, the host/guest workflow, proof review, max charge, settlement, disputes, and trust/safety expectations. Do not present the app as a finished payment, payout, identity verification, or emergency response system.

## 2. Roles

| Role | Responsibilities | What they should not do |
| --- | --- | --- |
| Founder / demo lead | Set up scenarios, explain limits, observe tester behavior, decide whether a session can continue safely, collect notes. | Do not promise production payments, guaranteed reimbursement, official provider integration, emergency response, or official ID verification. |
| Host tester | Create or host pods, explain intended ride details, upload quote/receipt/meter proof, respond to admin requests. | Do not collect off-app payments while claiming RidePod protection. Do not mark proof as verified. |
| Guest tester | Join pods, review max charge, follow settlement/dispute flow, report confusion or concerns. | Do not assume demo payment state means real charge protection. Do not resolve disputes directly in the app. |
| Admin reviewer | Review proofs, above-cap cases, disputes, member safety reports, and ID verification placeholders. Add clear notes. | Do not accuse users. Do not approve above-cap or suspicious items without documented reasoning. |
| Support operator | Triage tester issues, document bugs/confusion, route proof/money/safety issues to the right reviewer. | Do not promise recovery for off-app payments. Do not notify reported members automatically. |

## 3. What Is Manual In Beta

The following are manual operations in closed beta:

- Proof review.
- Receipt/meter proof review.
- Above-cap review.
- Suspicious proof review.
- Dispute review.
- Payout/reimbursement decision.
- Account restriction/safety report review.
- ID verification placeholder review.

## 4. What Is Mock / Demo-Only

The following are not production systems in closed beta:

- Real Stripe payment capture.
- Real host payout.
- Real OCR.
- AI receipt detection.
- Provider API pricing.
- Real Uber/DiDi/Lyft integration.
- Real ID document verification.
- Real emergency response.
- Full recurring billing.

Use phrases like "demo state", "manual review", and "mock payment state" when explaining these areas.

## 5. Beta Tester Onboarding Checklist

Before each test session, explain:

- [ ] RidePod does not provide drivers.
- [ ] The host books or takes the external ride.
- [ ] Quote proof is different from final receipt or meter proof.
- [ ] Max charge is the guest-facing cap for that ride.
- [ ] Proof review is manual in beta.
- [ ] Disputes must be raised during the dispute window.
- [ ] Off-app payments are not protected.
- [ ] Demo/mock payment status may appear and is not real payment capture.

## 6. Admin Review SOP

### A. Quote Above Cap

1. Check the quote amount shown in the uploaded proof.
2. Compare the quote amount to the booking fare cap.
3. If quote is above cap, ask host for a lower quote or require higher max approval from guests.
4. Do not mark the ride ready to book unless the cap rule is satisfied.
5. Add admin notes with the amount, cap, and decision.

### B. Receipt Above Cap

1. Check the final receipt amount.
2. Compare the receipt amount to the booking fare cap and guest max charge.
3. Hold settlement if the receipt is above cap.
4. Riders cannot be charged above max unless higher max approval was explicitly obtained.
5. Add admin notes before resolving.

### C. Meter Proof Above Cap

1. Check the meter proof amount and taxi context.
2. Compare the amount to the taxi baseline or booking fare cap.
3. Confirm the route roughly matches the pod route.
4. Route the case to manual review if above cap or unclear.
5. Do not finalize reimbursement until review is cleared.

### D. Suspicious Proof

1. Do not accuse the user.
2. Mark proof under review.
3. Request more info if proof is unclear, incomplete, inconsistent, or mismatched.
4. Hold reimbursement if needed.
5. Add calm, factual notes only.

### E. Guest Dispute

1. Review the proof.
2. Review the ride timeline.
3. Review the report note and any available evidence.
4. Check settlement state and payout state.
5. Hold payout if needed.
6. Resolve with notes explaining the decision.

### F. Member Safety Report

1. Keep the report private.
2. Do not notify the reported member automatically.
3. Review reporter, reported member, pod, and ride context.
4. Escalate manually if urgent.
5. Document action taken or why no action was taken.

### G. ID Verification Request

1. Confirm no identity document was collected.
2. Treat the request as a manual trust review placeholder.
3. Do not claim official ID verification.
4. If approved, mark only the supported internal/manual status.
5. Add notes that no document was collected.

## 7. Proof Review Checklist

| Check | Pass / fail notes |
| --- | --- |
| Amount visible |  |
| Date/time visible |  |
| Provider/taxi type visible |  |
| Route roughly matches |  |
| Amount within cap |  |
| Quote and receipt consistent |  |
| Certification accepted |  |
| No obvious mismatch |  |
| No active dispute |  |
| Admin notes added |  |

## 8. Dispute Review Checklist

- [ ] Reporter identity reviewed.
- [ ] Ride instance confirmed.
- [ ] Issue type reviewed.
- [ ] Note/evidence reviewed.
- [ ] Proof amount checked.
- [ ] Booking fare cap checked.
- [ ] Settlement state checked.
- [ ] Payout state checked.
- [ ] Prior admin actions reviewed.
- [ ] Final decision notes added.

## 9. Payout / Reimbursement Beta Rule

Do not send real payouts in closed beta unless payment ops are explicitly enabled. Use payout status as demo/manual state.

If real money is later enabled, payout only after:

- Proof is verified.
- Dispute window has expired or the dispute is resolved.
- Admin review is cleared.
- No above-cap issue remains unresolved.

## 10. Off-App Payment Policy

Off-app payments are not protected. RidePod cannot help with max-charge disputes, proof review, or reimbursement if payment happens outside the app.

Operator response:

1. Warn the user that off-app payments are outside RidePod protection.
2. Document the event.
3. Do not promise recovery.

## 11. Incident Escalation

| Level | Type | Examples | Operator action |
| --- | --- | --- | --- |
| Level 1 - Normal issue | Workflow or UI issue | Confusing UI, wrong status, minor proof problem. | Document bug/confusion, continue session if safe. |
| Level 2 - Money/proof issue | Financial or proof review issue | Above-cap proof, dispute, wrong receipt. | Hold settlement/payout state, route to admin reviewer. |
| Level 3 - Safety concern | Member trust/safety issue | Harassment, unsafe behavior, identity mismatch. | Keep private, escalate to founder/admin reviewer, document carefully. |
| Level 4 - Emergency | Immediate safety emergency | User safety emergency. | Direct them to local emergency services immediately. Do not rely on RidePod app as emergency service. |

## 12. Beta Metrics To Track

| Metric | How to record | Why it matters |
| --- | --- | --- |
| Pod creation success | Success/fail per tester. | Measures first workflow comprehension. |
| Join/lock success | Success/fail and blocker reason. | Measures eligibility and max charge understanding. |
| Quote upload success | Success/fail and time to complete. | Tests host booking workflow. |
| Receipt upload success | Success/fail and proof clarity. | Tests settlement readiness. |
| Meter proof upload success | Success/fail and amount clarity. | Tests taxi meter path. |
| Settlement understanding | 1-5 tester rating plus notes. | Measures trust in split and proof process. |
| Dispute rate | Count per session/scenario. | Shows friction and trust gaps. |
| Admin review time | Minutes from case open to decision. | Estimates ops burden. |
| Off-app leakage attempts | Count and context. | Identifies payment protection risk. |
| Tester trust score / qualitative rating | 1-5 plus comments. | Tracks confidence in the product. |
| Tester confusion points | Free text. | Feeds demo and UI improvements. |
| Repeat-use intent | Yes/no/maybe plus why. | Measures closed beta signal. |

## 13. Feedback Form Prompts

Ask testers:

- What confused you?
- Did you understand RidePod does not provide drivers?
- Did you understand max charge?
- Did you understand quote vs receipt?
- Did you trust the proof/settlement process?
- Would you use this for airport/campus/community rides?
- What felt risky?
- What should be simpler?
- What screen was hardest?

## 14. Beta Session Template

```text
Date:
Tester:
Role:
Scenario:
Flow completed:
Confusion points:
Bugs:
Trust rating 1-5:
Would use? yes/no:
Follow-up notes:
```

## 15. Production Blockers

Before production, resolve:

- Real payment architecture.
- Real payout architecture.
- Legal/compliance review.
- Terms/privacy/safety policy.
- Storage policy verification.
- Admin auth verification.
- Support process.
- Chargeback/dispute process.
- Proof retention policy.

## 16. Commands

Run before considering this playbook ready:

```powershell
npm.cmd run test:money-safety
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Record failures as beta blockers unless they are clearly unrelated to the closed beta demo environment.
