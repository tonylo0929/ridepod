# RidePod Closed Beta Route Smoke Test

Date: 2026-05-20

This smoke test checks the closed beta/demo route surface. It is a QA/fix-only record, not a product plan.

## Route Structure Inspected

- App Router routes live under `src/app`.
- Primary authenticated app routes live under `src/app/(app)`.
- No `pages/`, `src/pages/`, or `src/routes/` router tree is present.
- Navigation surfaces inspected: `src/components/app-shell.tsx`, `src/components/home-menu-drawer.tsx`, beta pages, pod cards, host dashboard links, notifications CTAs, and route-level pages.
- Beta/demo routes inspected: `/beta`, `/beta/scenarios`.
- Admin routes inspected: `/admin/review`, `/admin/reconciliation`.
- Auth routes inspected: `/login`, `/register`, `/profile`.

## Route Inventory

| Route | Page purpose | Expected user role | Status | Data source | Notes |
| --- | --- | --- | --- | --- | --- |
| `/login` | Log in | Logged-out | Pass | Mixed | HTTP 200. Shows “Log in”. |
| `/register` | Create account | Logged-out | Pass | Mixed | HTTP 200. Shows “Create account”. |
| `/profile` | Profile, trust/safety, verification placeholder | Host / Guest | Pass | Mixed | HTTP 200. Profile route opens; logged-out handling is app-level/mock dependent. |
| `/how-it-works` | Product education | Logged-out / Host / Guest | Pass | Static | HTTP 200. Includes “RidePod does not provide drivers.” |
| `/beta` | Closed beta landing and request access | Tester / Founder | Pass | Static / local mock | HTTP 200. Includes Start demo, beta limits, request access, and feedback placeholder. |
| `/beta/scenarios` | Beta scenario switcher | Founder / Tester | Guarded | Static / mock | HTTP 200. Demo mode off shows “Demo scenarios are not enabled.” |
| `/create` | Create pod entry | Host | Pass | Mock | HTTP 200. Canonical route; `/create-pod` is not a route. |
| `/create/scheduled` | Scheduled one-time create flow | Host | Pass | Mock | HTTP 200. Covers ride app / fixed quote and taxi meter flow entry. |
| `/create/recurring` | Recurring pod flow | Host | Pass | Mock | HTTP 200. Recurring route opens. |
| `/pods` | My Pods | Host / Guest | Pass | Mixed | HTTP 200. Canonical route; `/my-pods` is not a route. |
| `/notifications` | Updates | Host / Guest | Pass | Mixed | HTTP 200. Canonical route; `/updates` is not a route. |
| `/host` | Host dashboard, quote/receipt/meter proof panels | Host | Pass | Mixed | HTTP 200. Proof upload/status surfaces are hosted here. |
| `/pods/usc-lax-001` | Ride instance / pod detail | Host / Guest | Pass | Mock fallback | HTTP 200. Public member preview entry point is on this page. |
| `/pods/usc-lax-001/join` | Join / lock seat flow | Guest | Pass | Mock | HTTP 200. Eligibility/payment authorization UI path opens. |
| `/pods/usc-lax-001/settlement` | Settlement timeline/details/dispute | Host / Guest | Pass | Mock fallback | HTTP 200. Settlement route opens. |
| `/pods/usc-lax-001/review` | Post-ride review/rating | Host / Guest | Pass | Mock | HTTP 200. Review route opens. |
| `/pods/usc-lax-001/replacement` | Host replacement flow | Host / Guest | Pass | Mock | HTTP 200. Replacement route opens. |
| `/settlement` | Settlement fallback/demo route | Host / Guest | Pass | Mock | HTTP 200. Opens a settlement experience from hosted pod fallback. |
| `/admin/review` | Admin review queue/detail | Admin | Pass / internal | Mixed | HTTP 200. Currently available as internal/demo admin surface. |
| `/admin/reconciliation` | Admin payment reconciliation | Admin | Pass / internal | Mock | HTTP 200. Internal/admin demo route. |
| `/create-pod` | Legacy/alternate create alias | Host | Missing | None | HTTP 404. Not linked by current navigation; canonical route is `/create`. |
| `/my-pods` | Legacy/alternate pods alias | Host / Guest | Missing | None | HTTP 404. Not linked by current navigation; canonical route is `/pods`. |
| `/updates` | Legacy/alternate updates alias | Host / Guest | Missing | None | HTTP 404. Not linked by current navigation; canonical route is `/notifications`. |
| `/definitely-missing-route` | 404 fallback | Any | Pass | Static | HTTP 404 as expected. |

## Smoke Test Results

Local server used: `http://localhost:3000`.

Canonical routes checked and opened without crash:

- `/login`
- `/register`
- `/profile`
- `/how-it-works`
- `/beta`
- `/beta/scenarios`
- `/create`
- `/create/scheduled`
- `/create/recurring`
- `/pods`
- `/notifications`
- `/host`
- `/pods/usc-lax-001`
- `/pods/usc-lax-001/join`
- `/pods/usc-lax-001/settlement`
- `/pods/usc-lax-001/review`
- `/pods/usc-lax-001/replacement`
- `/settlement`
- `/admin/review`
- `/admin/reconciliation`

Missing aliases checked:

- `/create-pod` returned 404.
- `/my-pods` returned 404.
- `/updates` returned 404.

These aliases are not currently linked from app navigation. The canonical routes are `/create`, `/pods`, and `/notifications`.

## Flow-Specific Notes

### Auth / Profile

- `/login`, `/register`, and `/profile` open.
- Login/register copy is present.
- Profile is still mixed Supabase/mock behavior.
- Public profile preview is implemented through member cards and does not intentionally expose email, phone, gender identity, risk status, or admin notes.

### How RidePod Works

- `/how-it-works` opens.
- The page includes the required note that RidePod does not provide drivers.
- No route crash found.

### Beta Landing

- `/beta` opens.
- CTAs present: Start demo, How RidePod works, flow cards, feedback placeholder, request beta access.
- Beta limits are clear and now use provider-neutral wording: “No live provider integration.”
- No real payment or payout promise was added.

### Scenario Switcher

- `/beta/scenarios` opens.
- Demo mode guard works in default local server state: “Demo scenarios are not enabled.”
- Scenario cards are source-checked behind `NEXT_PUBLIC_RIDEPOD_DEMO_MODE=true`.
- Load demo uses mock/local state only and does not write to Supabase.

### Create Pod

- `/create`, `/create/scheduled`, and `/create/recurring` open.
- Current canonical route is `/create`, not `/create-pod`.
- Ride app / fixed quote and taxi meter copy exist in the scheduled flow source.
- Booking fare cap and max charge per guest copy exist in the create flow source.
- “Host is riding?” was not found in source.

### My Pods / Dashboard

- `/pods` and `/host` open.
- Current canonical updates route is `/notifications`.
- Human-readable status labels are implemented in shared UI/status helpers.
- No “4/4 seats owned” copy was found during this pass.

### Quote / Receipt / Meter Proof

- Proof status/upload surfaces are reached through `/host` and ride-instance proof flows.
- Certification and proof preview behavior are covered by existing tests.
- No “forever banned” or “crime of forgery” user-facing proof copy was found in app source.

### Settlement

- `/pods/usc-lax-001/settlement` and `/settlement` open.
- Settlement/dispute window UI is present in settlement and recurring proof flow sources.
- No route crash found.

### Updates

- `/notifications` opens.
- `/updates` is not a route and is not linked by current navigation.

### Admin Review

- `/admin/review` opens.
- Admin route is currently an internal/demo surface, not a production admin-auth guarantee.
- Admin proof preview/action flows are covered by existing tests and source checks.

### Public Member Preview / Report Concern

- Public member preview and report concern are component/modal entry points, not standalone routes.
- Source check confirms `PublicMemberCard` and `Report concern` are wired.
- Emergency disclaimer exists in report concern component:
  “Do not use this form for emergencies. Contact local emergency services immediately.”

## Risky Wording Search

Searched app source and docs for:

- RidePod driver.
- guaranteed refund.
- guaranteed reimbursement.
- 100% safe.
- 100% verified.
- escrow.
- official Uber/DiDi/Lyft integration.
- AI verified.
- fake proof.
- AI fake.
- crime of forgery.
- forever banned.
- upload HKID.
- upload passport.
- selfie verification.
- face scan.
- gal only.
- boy and gal.
- Wait at.
- Min seats to book.
- Target seats.
- Host is riding?

Fix made:

- `/beta` beta limit copy changed from provider-specific “official” wording to “No live provider integration.”

Remaining matches are in docs that list wording to avoid, or in test assertions that ensure risky phrases are absent from app surfaces.

## Protected / Guarded Behavior

- `/beta/scenarios` is guarded by `NEXT_PUBLIC_RIDEPOD_DEMO_MODE=true`.
- Admin routes are currently accessible as internal/demo routes and must not be presented as production-secured admin access.
- Auth/profile route guards remain mixed/mock and should be verified again before external tester accounts are used.

## Optional Route Test File

No Playwright, Cypress, Vitest, or route smoke test framework is currently configured. No new test framework was added. This document is the manual route smoke checklist for BETA-5.

## Remaining Beta Limitations

- Real payments are not enabled.
- Real payouts are not enabled.
- Admin auth is not production-hardened.
- Supabase policies and seeded data must still be tested in the target Supabase project.
- Scenario reset is mock/local unless the guarded dev/test Supabase reset script is run manually.
- Feedback and beta access requests are not full CRM workflows.

## BETA-6 Gate

BETA-6 Go/No-Go Review can start after the required command suite passes.
