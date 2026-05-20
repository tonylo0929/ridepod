# RidePod Closed Beta Tester Session Prep

Audience: founder / demo lead, support operator, and admin reviewer.

Use this checklist to run one closed beta tester session without drifting into production promises. It assumes the app is in the current GO WITH LIMITATIONS state and that payments, payouts, provider APIs, OCR, ID verification, and emergency response remain demo/manual or unavailable.

## 1. Session Goal

Each tester session should answer three questions:

- Does the tester understand RidePod does not provide drivers?
- Does the tester understand host booking, proof review, max charge, settlement, and disputes?
- Does the tested flow create enough trust to continue beta testing?

Do not use the session to validate real payment movement, real provider booking, real host payout, or automated trust/safety decisions.

## 2. Pre-Session Setup

Run these commands before the session:

```powershell
npm.cmd run test:money-safety
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

If any command fails, record the failure in the issue tracker and do not start a tester session unless the founder explicitly accepts the risk.

For demo scenarios, start the app with demo mode enabled:

```powershell
$env:NEXT_PUBLIC_RIDEPOD_DEMO_MODE="true"
npm.cmd run dev
```

Open:

- `/beta` for tester-facing beta framing.
- `/beta/scenarios` for scenario selection.
- `/host` for host proof/status flows.
- `/admin/review` for internal admin review.
- `/pods/usc-lax-001/settlement` for settlement and dispute review.

## 3. Opening Script

Read this before asking the tester to act:

```text
This is a closed beta workflow test. RidePod does not provide drivers. The host books or takes the external ride outside RidePod.

Some payment, payout, proof review, admin review, and verification states are demo or manual states. We are testing whether the workflow, wording, and trust model make sense.

Please say out loud whenever something feels unclear, risky, too wordy, or different from what you expected.
```

## 4. Scenario Order

Use one primary scenario per tester unless the session is explicitly a longer walkthrough.

| Tester goal | Scenario ID | Route | Observe |
| --- | --- | --- | --- |
| Host quote workflow | `scheduled_ride_app_quote_needed` | `/host` | Whether quote proof before booking is clear. |
| Host booking readiness | `scheduled_ride_app_ready_to_book` | `/host` | Whether ready-to-book copy avoids implying RidePod books the ride. |
| Receipt after ride | `scheduled_ride_app_receipt_needed` | `/host` | Whether final receipt vs quote is clear. |
| Taxi meter workflow | `scheduled_taxi_meter_proof_needed` | `/host` | Whether no upfront quote is understood. |
| Recurring workflow | `recurring_back_and_forth` | `/create/recurring` | Whether recurring template and per-ride settlement are clear. |
| Settlement trust | `settlement_ready` | `/pods/usc-lax-001/settlement` | Whether final split and dispute window feel trustworthy. |
| Dispute/admin review | `dispute_review` | `/admin/review` | Whether payout hold/manual review language is calm and clear. |
| Admin review queue | `admin_review_queue` | `/admin/review` | Whether admin decisions have enough evidence and notes. |
| Profile eligibility | `profile_eligibility` | `/profile` | Whether private vs public trust signals feel safe. |
| Safety report | `safety_report` | `/pods/usc-lax-001` | Whether private report handling is understood. |

The taxi partner quote scenario is a future beta prototype. Use it only if the session is explicitly about future taxi partner quote mode.

## 5. Observer Checklist

Track these during the session:

- Did the tester think RidePod provides a driver?
- Did the tester understand who books or takes the external ride?
- Did the tester understand quote proof vs receipt or meter proof?
- Did the tester understand max charge per guest?
- Did the tester understand when the host can book?
- Did the tester understand settlement and the dispute window?
- Did any screen imply real payment, payout, OCR, provider API, ID verification, or emergency support?
- Did any action feel hard to find?
- Did any copy feel too wordy or legally risky?
- Did the tester trust the flow more than a group chat process?

## 6. Stop / Pause Rules

Pause the session and create a P0 or P1 issue if:

- The app cannot run or a primary route crashes.
- The tester cannot complete the selected core flow.
- The tester sees private proof/admin data they should not see.
- The tester believes real payment capture or payout is happening.
- The tester believes RidePod provides drivers.
- The taxi meter flow asks for an upfront quote before the ride.
- The ride app flow allows protected booking without quote proof.
- The settlement flow says guests can be charged above max without explicit approval.
- A safety report appears public to the reported member.

## 7. Capture Notes

Use `docs/ridepod-beta-feedback-form.md` for session notes and `docs/ridepod-beta-feedback-form-template.tsv` for spreadsheet import.

Create issues in `docs/ridepod-beta-issue-tracker.md` or `docs/ridepod-beta-issue-tracker-template.tsv` when the tester reports:

- A bug.
- A trust blocker.
- A money/protection misunderstanding.
- A proof/receipt/admin review problem.
- A safety/privacy concern.
- Repeated wording confusion.

Use severity from the issue tracker. If unsure, mark the issue one level higher during beta triage.

## 8. Closing Questions

Ask these before ending the session:

- What confused you most?
- What felt risky?
- What did you expect RidePod to do that it did not do?
- Did you trust the proof and settlement process?
- Would you use this for airport, campus, community, or recurring rides?
- What one thing should be simpler before another tester tries it?

## 9. Post-Session Triage

Within 24 hours:

- Add or update issue tracker rows.
- Link each issue to the scenario and route.
- Mark P0 issues as blocking before the next tester session.
- Mark P1 issues as required before wider beta.
- Summarize top confusion points and trust blockers.
- Decide whether to continue, pause, or narrow the next tester session.

Recommended output:

```text
Session:
Tester role:
Scenario:
Completed? yes/no
Top confusion:
Top trust blocker:
P0/P1 issues:
P2/P3 issues:
Continue / pause / narrow:
Next action:
```
