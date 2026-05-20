# RidePod Pre-Beta Readiness Gate

This document is the feature-freeze and readiness gate for the closed beta demo script and operations playbook. It identifies what is built, what is mock or demo-only, what is Supabase-connected, what requires manual operations, and what must not be promised to testers.

## 1. Route / Page Inventory

| Page / route | Status | Data source | User role | Notes |
| --- | --- | --- | --- | --- |
| Login `/login` | Done | Mixed | Logged-out | Supabase Auth path with safe fallback behavior when Supabase is unavailable. |
| Register `/register` | Done | Mixed | Logged-out | Creates account/profile where Supabase is configured; demo fallback remains available. |
| Profile `/profile` | Done | Mixed | Host / Guest | Profile, trust fields, verification placeholder, public preview, and save behavior are present. |
| How RidePod Works `/how-it-works` | Done | UI only | Logged-out / Host / Guest | Static product explanation. Must stay within closed beta/demo claims. |
| Create Pod `/create` | Partial | Mock | Host | Entry point exists; eligibility/safety mode UI is local/demo-oriented. |
| Scheduled One-Time flow `/create/scheduled` | Partial | Mock | Host | Demo flow exists for scheduled ride app and taxi meter setup. |
| Recurring Pod flow `/create/recurring` | Partial | Mock | Host | Recurring weekly/back-and-forth UI exists; persistence remains demo/local. |
| My Pods `/pods` | Partial | Mixed | Host / Guest | Supabase read helpers and mock fallback exist. Verify seeded data before demos. |
| Host Dashboard `/host` | Partial | Mixed | Host | Host proof/status workflow, participant list, and proof previews are wired with fallback paths. |
| Updates `/notifications` | Partial | Mock fallback | Host / Guest | Update feed is mostly derived/demo data with Supabase-related notification helpers. |
| Quote Upload | Partial | Mixed | Host | Quote proof metadata and optional storage upload are wired; review remains manual/demo. |
| Receipt Upload | Partial | Mixed | Host | Receipt proof metadata and optional storage upload are wired; no automatic verification. |
| Meter Proof Upload | Partial | Mixed | Host | Meter proof metadata and optional storage upload are wired; above-cap cases need manual review. |
| Settlement Timeline `/pods/[id]/settlement` | Partial | Mixed | Host / Guest | Settlement state and dispute window are represented; no real payment movement. |
| Settlement Details `/pods/[id]/settlement` | Partial | Mixed | Host / Guest | Demo settlement details exist; final reimbursement/payment decisions are manual. |
| Admin Review `/admin/review` | Partial | Mixed | Admin | Admin review queue/detail/actions exist; admin auth and ops process need manual production review. |
| Public Member Preview | Done | Mock fallback | Host / Guest | Public member card/preview shows safe public identity signals only. |
| Report Concern | Partial | Mock fallback | Host / Guest | Member safety report placeholder exists; creates admin review case when supported, otherwise local success. |

## 2. Mock vs Supabase Status

| Area | Status | Notes |
| --- | --- | --- |
| Supabase schema | Real Supabase | Core migrations exist for profiles, pods, members, ride instances, proofs, settlements, admin review, events, and storage design. Needs manual review before production. |
| RLS policies | Real Supabase / Needs manual review | RLS SQL and QA checks exist. Policies must be tested against a real Supabase project before closed beta data is used. |
| My Pods read | Real Supabase / Mock fallback | Supabase helpers exist with fallback data for demos and missing env. |
| Ride instance detail read | Real Supabase / Mock fallback | Ride instance, proof, and settlement summaries are available with fallback behavior. |
| Proof metadata write | Real Supabase / Mock fallback | Quote, receipt, and meter proof metadata helpers exist. Certification is required. |
| Storage upload | Real Supabase / Mock fallback | Real private storage upload is gated by storage config; mock proof paths remain supported. |
| Signed proof preview | Real Supabase / Mock fallback | Temporary signed URLs are generated for private proof files. Mock paths do not call Supabase. |
| Admin review cases | Real Supabase / Mock fallback | Case creation/read/actions are present. Admin auth and service-role use require production hardening. |
| Notifications / Updates | Mock fallback | Some event/notification helpers exist, but the updates feed remains mostly derived/demo-oriented. |
| Auth/Profile | Real Supabase / Mock fallback | Login, register, session/profile helpers, profile bootstrap, and profile save paths are present. |
| Eligibility gates | Mock fallback / UI only | Eligibility logic uses local profile/pod safety fields. Supabase pod safety/access field persistence is deferred. |
| Settlement / dispute window | Mixed / Needs manual review | Settlement and dispute states are represented. No real charge capture, refund, or payout exists. |

## 3. Feature Freeze

Frozen for the closed beta demo:

- Scheduled one-time ride app / fixed quote.
- Scheduled taxi meter.
- Recurring weekly template.
- Ride instance status dashboard.
- Quote proof.
- Receipt proof.
- Meter proof.
- Settlement timeline.
- Dispute window.
- Admin review.
- Updates.
- Profile / eligibility.
- Member report placeholder.

No new product areas should be added before BETA-1.

## 4. Do Not Promise Yet

Do not promise these capabilities to testers:

- Real payments.
- Real Stripe capture.
- Real host payout.
- Automatic receipt verification.
- AI fraud detection.
- OCR accuracy.
- Provider API pricing.
- Uber/DiDi/Lyft official integration.
- Guaranteed refunds.
- Guaranteed reimbursement.
- Guaranteed safety.
- Emergency response.
- Official ID verification.
- Legal, tax, or insurance coverage.

Preferred demo language:

- Manual review / demo flow.
- Mock payment state.
- Proof review placeholder.
- Closed beta test only.

## 5. Manual Ops Required

Closed beta still requires manual operations for:

- Proof review.
- Above-cap review.
- Suspicious receipt review.
- Meter proof review.
- Guest disputes.
- No-show disputes.
- Host cancellation after booking.
- Payout/reimbursement decision.
- Account restriction/safety concern review.
- ID verification placeholder review.

## 6. Env / Secret Check

Environment variables used by the current implementation:

| Variable | Purpose | Exposure notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase client URL. | Public by design; no secret value should be committed. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase anon key. | Public by design; RLS must enforce access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin helper where needed. | Must never be `NEXT_PUBLIC_*`; helper imports `server-only`. |
| `NEXT_PUBLIC_RIDEPOD_USE_SUPABASE_STORAGE` | Enables real Supabase proof storage upload. | Optional feature flag; app can use mock proof paths without it. |
| `PAYMENT_PROVIDER` / `RIDEPOD_PAYMENT_PROVIDER` | Mock/test payment provider selection. | Closed beta demo should remain mock payment state. |
| `STRIPE_TEST` | Stripe test gating if the helper is exercised. | No real Stripe flow should be promised for closed beta. |
| `RIDEPOD_URL` / `NEXT_PUBLIC_RIDEPOD_URL` | App URL used by payment-related helper code. | Not a secret; payment features remain out of beta scope. |

Security notes:

- Do not print or document secret values.
- No `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` should exist.
- Service role access should stay in server-only helpers.
- Client code should use the anon key and RLS only.
- The app is intended to build without Supabase env vars by using lazy validation and mock fallback paths.

## 7. Copy Safety Check

Risky wording searched in auth, profile, safety, public member preview, report concern, docs, and relevant app files:

- RidePod driver.
- guaranteed refund.
- guaranteed reimbursement.
- 100% safe.
- 100% verified.
- escrow.
- official Uber/Lyft/DiDi integration.
- AI verified.
- upload HKID.
- upload passport.
- crime of forgery.
- forever banned.
- gal only.
- boy and gal.

Preferred wording for beta materials:

- RidePod does not provide drivers.
- Host books or takes the external ride.
- Manual review.
- Verified receipt.
- Meter proof.
- Booking fare cap.
- Max charge per guest.
- Designed for safer matching.
- Account action if needed.

Result: no simple user-facing copy changes were required during this readiness pass.

## 8. Closed Beta Readiness Checklist

- [ ] App builds successfully.
- [ ] Login/Register route opens.
- [ ] Profile route opens.
- [ ] How RidePod Works route opens.
- [ ] Scheduled Ride App flow opens.
- [ ] Scheduled Taxi Meter flow opens.
- [ ] Recurring Pod flow opens.
- [ ] My Pods opens.
- [ ] Updates opens.
- [ ] Admin Review opens or is intentionally internal/mock.
- [ ] Quote upload flow opens.
- [ ] Receipt upload flow opens.
- [ ] Meter proof upload flow opens.
- [ ] Settlement timeline opens.
- [ ] Settlement details/dispute flow opens.
- [ ] Supabase fallback behavior documented.
- [ ] Manual ops required documented.
- [ ] Risky wording checked.
- [ ] No production payment promises.

## 9. Production Blockers

Production blockers before a real launch:

- Real payment authorization/capture is not implemented.
- Real host payout is not implemented.
- Stripe/payment compliance architecture is not complete.
- Admin auth and service-role access must be verified in production.
- Supabase RLS and storage policies must be tested against real seeded users.
- Manual review operations must be staffed and documented.
- Dispute, refund, chargeback, tax, legal, and insurance processes need review.
- Official ID verification is not implemented.
- Emergency response is not provided by RidePod.

## 10. BETA-1 Gate

BETA-1 can start for demo script and ops playbook work after the required commands pass. It should not start as a production or real-money beta.

Recommended next work:

- BETA-1: Closed beta demo script.
- BETA-2: Manual ops playbook.
- BETA-3: Seeded demo run-through.
- BETA-4: Tester-facing limitations and safety copy.
