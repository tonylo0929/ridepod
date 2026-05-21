# RidePod Closed Beta Go / No-Go Review

Decision options:

- GO
- GO WITH LIMITATIONS
- NO-GO

Current recommendation: GO WITH LIMITATIONS

Decision date: 2026-05-20

Reviewer: Codex QA pass

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
- Taxi Partner Quote Mode, only as future beta prototype direction.

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
| Taxi partner quote mode | Mock / future beta prototype | Licensed taxi partner quote, guest acceptance, mock payment state, completion, dispute window, payout pending, and admin review are represented as demo state. | Yes, only if clearly described as no real dispatch or payout yet. |
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

## 4. Route Status

Final route smoke was run against the local dev server on 2026-05-20.

| Route | Status | Notes |
| --- | --- | --- |
| `/login` | Pass | HTTP 200. |
| `/register` | Pass | HTTP 200. |
| `/profile` | Pass | HTTP 200. |
| `/how-it-works` | Pass | HTTP 200. |
| `/beta` | Pass | HTTP 200. |
| `/beta/scenarios` | Guarded / Pass | HTTP 200. Demo scenarios are disabled unless `NEXT_PUBLIC_RIDEPOD_DEMO_MODE=true`. |
| `/create` | Pass | HTTP 200. Canonical create route. |
| `/create/scheduled` | Pass | HTTP 200. Scheduled ride app / taxi meter flow entry. |
| `/create/recurring` | Pass | HTTP 200. Recurring flow entry. |
| `/pods` | Pass | HTTP 200. Canonical My Pods route. |
| `/notifications` | Pass | HTTP 200. Canonical Updates route. |
| `/host` | Pass | HTTP 200. Host dashboard/proof flow entry. |
| `/pods/usc-lax-001` | Pass | HTTP 200. Pod detail / public member preview entry. |
| `/pods/usc-lax-001/join` | Pass | HTTP 200. Join flow entry. |
| `/pods/usc-lax-001/settlement` | Pass | HTTP 200. Settlement details / dispute route. |
| `/admin/review` | Internal demo / Pass | HTTP 200. Must remain internal/demo-only before production admin auth hardening. |
| `/create-pod` | Missing alias | HTTP 404. Current route convention is `/create`. |
| `/my-pods` | Missing alias | HTTP 404. Current route convention is `/pods`. |
| `/updates` | Missing alias | HTTP 404. Current route convention is `/notifications`. |

## 5. Go Criteria

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
- No wording presents taxi partners as RidePod-operated drivers.
- No "guaranteed refund/reimbursement" wording is visible.
- No absolute safety or verification wording is visible.
- Supabase fallback does not crash app.
- Manual review path is documented.
- Closed beta limitations are visible to testers.

Status: satisfied for GO WITH LIMITATIONS. Missing aliases are documented and not linked by current app navigation.

## 6. No-Go Criteria

Closed beta must not start if any P0 issue exists.

P0 examples:

- App cannot build.
- Main routes crash.
- Users can access another user's private proof/admin data.
- Service role key is exposed to browser.
- Ride app flow allows protected booking without quote proof.
- Taxi meter flow incorrectly requires quote proof before ride.
- Settlement says guests must all manually confirm before host can be paid.
- UI claims real payments/payouts are live when they are not.
- UI says RidePod provides drivers.
- Admin Review is publicly exposed without guard/demo intent.
- Report concern exposes reporter details publicly.

Status: no P0/P1 beta blockers found in this final QA pass.

## 7. P1 Issues That May Still Allow Limited Beta

These can be acceptable only if testers are clearly told it is closed beta/demo:

- Some flows use mock data.
- Some CTAs are placeholders.
- Supabase is partially wired.
- Admin actions are manual/mock.
- Proof preview is mock in some flows.
- Settlement calculations are demo values.
- ID verification is placeholder only.

Status: accepted as limitations for closed beta, not production readiness.

## 8. Tester Warning Copy

Recommended tester copy:

"Closed beta is for testing the workflow and trust model. Real payments, payouts, OCR, provider APIs, and automatic fraud detection are not enabled unless explicitly stated."

"RidePod does not provide drivers. The host books or takes the external ride outside RidePod."

"Proof and settlement flows may use demo/manual states during beta."

Taxi Partner Quote tester copy:

"Taxi Partner Quote Mode is a future beta prototype. A licensed taxi partner can quote one shared pod price, guests accept the quote, mock payment state is recorded, completion opens the dispute window, and payout becomes pending. No real taxi dispatch, real payment, or real payout is enabled yet."

## Taxi Partner Quote Readiness Addendum

| Mode | Meaning | Proof | Status |
| --- | --- | --- | --- |
| Ride app / fixed quote | Host/organizer books through an app or provider that shows fare before booking. | Fresh quote before booking. Final receipt after ride. | Current beta / proof-based mode. |
| Taxi meter | Host/organizer takes a real street taxi with a meter. | No upfront quote. Meter proof or taxi receipt after ride. | Current beta / meter-proof mode. |
| Taxi partner quote | Licensed taxi partner quotes one shared pod price. | Partner quote before guests accept. Completion plus dispute window before payout. | Future beta prototype / no real dispatch or payout yet. |

Flow: organizer creates shared taxi pod, guests join and lock, organizer selects taxi type, organizer adds luggage/accessibility needs, taxi partner submits quote, guests accept quote, mock payment state is recorded, taxi partner ride is marked completed, dispute window opens, payout becomes pending, admin review handles issues, and no issue means payout ready in a future/live version.

Money model: `fareShareCents = ceil(driverQuoteCents / guestCount)`, `platformFeeCents = max(ceil(fareShareCents * 10%), HK$6)`, `guestChargeCents = fareShareCents + platformFeeCents`, `driverPayoutCents = driverQuoteCents`. Example: HK$240 quote, 4 guests, HK$60 fare share, HK$6 platform fee, HK$66 guest pays, HK$24 RidePod earns, HK$240 taxi partner payout.

Go/no-go caution: use licensed taxi partners/fleets first. Legal, licensing, insurance, safety, and payment/payout review are required before live operation. Accessibility or special vehicle requests are available only if supported by the taxi partner. Women-only controls who can join the shared pod; it does not guarantee a female taxi driver unless supported by the taxi partner.

## 9. Final Go / No-Go Scorecard

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

## 10. Final Decision

Decision:
GO WITH LIMITATIONS

Reason:

- All required commands pass.
- Core beta routes open under the current route convention.
- Closed beta limitations are documented and visible in beta/demo materials.
- No P0/P1 route, build, private-data, service-role, or dangerous payment-promise blocker was found.
- Payments, payouts, ID verification, admin ops, RLS validation, and proof review remain mock/manual or require target-environment review.

Must-fix before tester session:

- None identified as P0/P1 in this final QA pass.

Can defer:

- Add aliases only if testers expect `/create-pod`, `/my-pods`, or `/updates`.
- Harden production admin auth before any real users or sensitive data.
- Validate Supabase RLS/storage policies in the target project with seeded users.
- Replace mock/local beta access and feedback collection with a real ops workflow if needed.
- Add real payment/payout architecture only in a separate approved phase.

Next action:

Use `docs/ridepod-closed-beta-tester-session-prep.md` to run BETA-7 tester session preparation.

## 11. Command Results

Ran on 2026-05-20:

- `npm.cmd run test:money-safety` - Pass.
- `npx.cmd tsc --noEmit` - Pass.
- `npm.cmd run lint` - Pass.
- `npm.cmd run build` - Pass.

No command failures were found during this final QA decision slice.

## 12. Security / Copy Checks

High-level security check:

- App builds without printing secrets.
- No `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` use was found.
- Service-role helper imports are server-only.
- Admin Review remains documented as internal/demo until production auth hardening.
- Signed proof URLs and private storage are covered by prior slices; no regression was found in this pass.

Risky wording check:

- No user-facing app copy requiring a P0/P1 fix was found.
- Remaining risky phrase matches are avoid-lists in docs or test assertions.
