# RidePod Closed Beta Go / No-Go Review

Decision options:

- GO
- GO WITH LIMITATIONS
- NO-GO

Current recommendation: “Pending final QA”

Decision date: [fill later]

Reviewer: [fill later]

## 1. Closed Beta Scope

Closed beta is allowed to test:

- Scheduled one-time ride app / fixed quote.
- Scheduled taxi meter.
- Recurring weekly pod.
- My Pods / Host Dashboard.
- Quote proof upload.
- Receipt upload.
- Meter proof upload.
- Settlement timeline.
- Settlement details / dispute window.
- Updates / notifications.
- Admin Review.
- Profile / eligibility.
- Public member preview.
- Report concern placeholder.
- How RidePod Works page.
- Closed Beta landing page.
- Demo scenario switcher.

## 2. Not Production Ready

These are not enabled in closed beta unless explicitly stated:

- Real Stripe payment capture.
- Real payment authorization.
- Real host payout.
- Real wallet.
- Real OCR.
- Real AI receipt detection.
- Real Uber/DiDi/Lyft APIs.
- TaxiFareFinder API.
- Full ID document verification.
- Real emergency response.
- Full legal/compliance review.
- Insurance/tax coverage.
- Fully automated fraud review.
- Fully automated dispute resolution.

## 3. Mock / Manual / Real Status

| Area | Status | Notes | Beta-safe? |
| --- | --- | --- | --- |
| Auth / Login | Supabase-connected / Mock fallback | Login and register routes open. Build does not require Supabase env at import time. | Yes, for closed beta. |
| Profile | Supabase-connected / Mock fallback | Profile, trust fields, verification placeholder, and save behavior exist. | Yes, with privacy limits explained. |
| Eligibility gates | Mock fallback | Eligibility rules use local/profile fields; Supabase pod safety-field persistence is deferred. | Yes, for workflow testing. |
| Scheduled ride app flow | Mock fallback | Create and host flows exist; quote proof controls booking permission in demo logic. | Yes. |
| Taxi meter flow | Mock fallback | Taxi meter path exists; meter proof after ride is represented. | Yes. |
| Recurring pod flow | Mock fallback | Recurring weekly/back-and-forth flow exists. | Yes. |
| My Pods / Host Dashboard | Mixed | Routes open with mock/Supabase fallback. | Yes. |
| Updates | Mock fallback | Notifications/updates route opens; many updates are demo/derived. | Yes. |
| Quote proof upload | Supabase-connected / Mock fallback | Metadata and optional storage upload exist; review remains manual/demo. | Yes, with manual review. |
| Receipt upload | Supabase-connected / Mock fallback | Metadata and optional storage upload exist; no automatic verification. | Yes, with manual review. |
| Meter proof upload | Supabase-connected / Mock fallback | Metadata and optional storage upload exist; above-cap review is manual. | Yes, with manual review. |
| Settlement timeline | Mock fallback / Manual review | Settlement and dispute window UI exists; no real money movement. | Yes, as demo state. |
| Dispute window | Mock fallback / Manual review | Dispute states and admin review path exist. | Yes, if clearly explained. |
| Admin Review | Supabase-connected / Manual review | Admin queue/actions exist as internal/demo surfaces. Admin auth needs production hardening. | Yes, internal only. |
| Proof preview | Supabase-connected / Mock fallback | Signed proof preview helper and admin/host preview surfaces exist. | Yes, if bucket remains private. |
| Supabase schema | Real | Migrations and seed data exist. Needs target-project validation. | Yes, after local/test validation. |
| RLS | Real / Needs manual review | RLS checks/docs exist. Must be verified against actual Supabase users. | Partial. |
| Storage | Supabase-connected / Mock fallback | Private proof bucket plan/upload/preview exist; real storage depends on env/config. | Yes, after policy check. |
| Payments | Not built / Mock fallback | Real payment capture and authorization are not enabled for beta. | Yes, only as mock state. |
| Payouts | Not built / Manual review | Real payouts are not enabled. | Yes, only as manual/demo status. |
| ID verification | UI only / Manual review | Placeholder/manual review only; no documents collected. | Yes, if presented as placeholder. |
| Safety report | Mock fallback / Manual review | Report concern flow exists; admin visibility may be mock/Supabase dependent. | Yes, with manual handling. |

## 4. Go Criteria

Closed beta can start only if:

- App builds successfully.
- Login/register routes open.
- Profile route opens.
- How RidePod Works route opens.
- Beta landing page opens.
- Create Pod flow opens.
- Scheduled ride app flow opens.
- Taxi meter flow opens.
- Recurring pod flow opens.
- My Pods opens.
- Updates opens.
- Quote upload screen opens.
- Receipt upload screen opens.
- Meter proof upload screen opens.
- Settlement screen opens.
- Admin Review opens or is safely internal/demo-only.
- No risky payment promises are visible.
- No “RidePod driver” wording is visible.
- No “guaranteed refund/reimbursement” wording is visible.
- No “100% safe / 100% verified” wording is visible.
- Supabase fallback does not crash app.
- Manual review path is documented.
- Closed beta limitations are visible to testers.

## 5. No-Go Criteria

Closed beta must not start if any P0 issue exists.

P0 examples:

- App cannot build.
- Main routes crash.
- Users can access another user’s private proof/admin data.
- Service role key is exposed to browser.
- Ride app flow allows protected booking without quote proof.
- Taxi meter flow incorrectly requires quote proof before ride.
- Settlement says guests must all manually confirm before host can be paid.
- UI claims real payments/payouts are live when they are not.
- UI says RidePod provides drivers.
- Admin Review is publicly exposed without guard/demo intent.
- Report concern exposes reporter details publicly.

## 6. P1 Issues That May Still Allow Limited Beta

These can be acceptable only if testers are clearly told it is closed beta/demo:

- Some flows use mock data.
- Some CTAs are placeholders.
- Supabase is partially wired.
- Admin actions are manual/mock.
- Proof preview is mock in some flows.
- Settlement calculations are demo values.
- ID verification is placeholder only.

## 7. Tester Warning Copy

Recommended tester copy:

“Closed beta is for testing the workflow and trust model. Real payments, payouts, OCR, provider APIs, and automatic fraud detection are not enabled unless explicitly stated.”

“RidePod does not provide drivers. The host books or takes the external ride outside RidePod.”

“Proof and settlement flows may use demo/manual states during beta.”

## 8. Final Go / No-Go Scorecard

| Category | Pass / Partial / Fail | Notes |
| --- | --- | --- |
| Product clarity | Partial | Core copy exists; tester feedback should confirm comprehension. |
| Driver/provider positioning | Pass | Beta and education pages state RidePod does not provide drivers. |
| Scheduled ride app flow | Partial | Demo flow exists; real provider integration is not enabled. |
| Taxi meter flow | Partial | Demo flow exists; meter proof review is manual. |
| Recurring pod flow | Partial | Recurring setup exists; recurring billing is not real. |
| Money protection wording | Pass | Max charge/fare cap wording is represented; real payment is not enabled. |
| Proof upload flow | Partial | Metadata/storage paths exist; review is manual/demo. |
| Settlement/dispute flow | Partial | UI/demo state exists; real payouts and dispute ops are manual. |
| Admin review flow | Partial | Internal/demo admin route exists; production auth hardening remains. |
| Auth/profile/eligibility | Partial | Supabase/mock paths exist; eligibility persistence is not complete. |
| Safety/reporting | Partial | Report concern placeholder exists; ops process is manual. |
| Supabase/data | Partial | Migrations, seed, and sanity checks exist; target-project validation required. |
| RLS/security | Partial | RLS checks exist; must be verified against real users/project. |
| Storage/proof preview | Partial | Private storage design/upload/preview exist; policies require target validation. |
| Demo scenario readiness | Pass | Registry, guarded switcher, mock reset helper, and reset guide exist. |
| Beta docs/readiness | Pass | Readiness gate, ops playbook, feedback form, issue tracker, route smoke, and reset docs exist. |

## 9. Final Decision Template

Decision:
[GO / GO WITH LIMITATIONS / NO-GO]

Reason:

Must-fix before tester session:

Can defer:

Next action:

## 10. Command Results

Ran on 2026-05-20:

- `npm.cmd run test:money-safety` - Pass.
- `npx.cmd tsc --noEmit` - Pass.
- `npm.cmd run lint` - Pass.
- `npm.cmd run build` - Pass.

No command failures were found during this review slice.
