# RidePod Supabase Integration Checklist

This checklist summarizes the current RidePod MVP Supabase integration status after SQL-2A through SQL-2T. It is a documentation and QA artifact, not a production approval.

## Status Legend

- ✅ Done
- 🟡 Partial / mock
- 🔴 Not done
- ⚠️ Needs manual review before production

## 1. Database Schema

| Area | Status | Notes | File / location |
| --- | --- | --- | --- |
| Core enums | ✅ Done | Pod type, ride option, lifecycle, ride instance status, proof type/status, settlement state, admin review state, and member state are defined. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `profiles` | ✅ Done | Stores user identity metadata used by seed and RLS. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `pods` | ✅ Done | Stores scheduled and recurring pod templates, route, fare cap, platform fee settings, and host. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `pod_members` | ✅ Done | Stores host/guest membership state, max charge, final charge, and lock timestamps. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `ride_instances` | ✅ Done | Stores per-ride status, leg, departure, proof links, settlement link, and fare cap. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `proofs` | ✅ Done | Stores proof metadata and private file reference in `file_url`. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `settlements` | ✅ Done | Stores verified fare, fare share, platform fee, reimbursement, and dispute window state. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `settlement_items` | ✅ Done | Stores per-user settlement line items. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `admin_review_cases` | ✅ Done | Stores manual review queue cases for above-cap proof, disputes, and holds. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| `pod_events` | ✅ Done | Stores audit-style lifecycle events. | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| Proof version columns | 🟡 Partial / mock | Current proof selection supports future `is_current` / superseded fields, but schema does not include those columns yet. | `src/lib/supabase/proof-metadata.ts` |

## 2. RLS / Security

| Policy area | Status | Risk | Next action |
| --- | --- | --- | --- |
| User profile access | ✅ Done | Users can access own profile; admin can access all. | Run role-based checks in `supabase/tests/ridepod_rls_security_checks.sql`. |
| Pod membership access | ✅ Done | Host/member access is scoped by helper functions. | Verify with real host, guest, and unrelated user sessions. |
| Ride instance access | ✅ Done | Host/member/admin can read; host/admin can update. | Verify host status update RLS with Supabase client session. |
| Proof metadata access | ✅ Done | Host can insert proof for hosted ride instance; host/member/admin can read metadata. | Decide before production whether guests should see all proof metadata fields. |
| Settlement access | ✅ Done | Host/member/admin can read settlement; guests read own settlement items; writes are admin-only. | Confirm group split visibility policy before production. |
| Admin review access | ⚠️ Needs manual review before production | RLS is admin-only, but admin auth model uses JWT `app_metadata.role = admin` and server/admin helpers. | Protect Admin Review route with verified admin auth/server-side access. |
| Pod events access | ✅ Done | Host/member can read scoped events; inserts are admin-only. | Add full audit event coverage in later ops slice. |
| Storage access | ✅ Done | Private bucket, host upload/read for hosted ride instances, admin read, no guest raw preview. | Test storage policies with real user sessions. |
| Service-role safety | ✅ Done | Admin client imports `server-only`; client helpers are guarded by money-safety tests. | Keep service-role imports out of client components. |

## 3. App Read Paths

| Feature | Supabase read status | Mock fallback | Notes |
| --- | --- | --- | --- |
| My Pods | ✅ Done | ✅ Yes | `getMyPods` reads pods and memberships through server Supabase client. |
| Recurring pods | ✅ Done | ✅ Yes | Seed and sanity checks cover recurring back-and-forth instances. |
| Ride instance detail | ✅ Done | ✅ Yes | `getRideInstanceDetailWithFallback` maps ride, pod, proof, settlement, review, and member context. |
| Admin review queue | ✅ Done | ✅ Yes | `getAdminReviewCasesWithFallback` uses server/admin read path with mock fallback. |
| Admin review detail | ✅ Done | ✅ Yes | Includes proof, settlement, evidence timeline, and dispute timeline data when available. |
| Settlement detail | 🟡 Partial / mock | ✅ Yes | Settlement UI exists and uses existing data/mocks; full Supabase settlement workflow is not production-final. |
| Updates / notifications | 🟡 Partial / mock | ✅ Yes | Admin action notifications are derived/computed; persistence is not implemented. |

## 4. App Write Paths

| Feature | Supabase write status | Current behavior | Remaining limitation |
| --- | --- | --- | --- |
| Proof metadata write | ✅ Done | `submitRideInstanceProofMetadata` validates certification, amount, type, and inserts proof metadata when Supabase/session allows. | Duplicate/version policy is MVP-level. |
| Quote proof submit | ✅ Done | Writes `QUOTE_SCREENSHOT`, sets ride to quote under review, routes above-cap to manual review flow. | Review approval remains manual/admin. |
| Final receipt submit | ✅ Done | Writes `FINAL_RECEIPT`, sets proof under review. | Settlement finalization is not automated production logic. |
| Meter proof submit | ✅ Done | Writes `METER_PROOF`, sets proof under review. | Taxi meter review is manual. |
| Ride instance status update | ✅ Done | `updateRideInstanceStatusAfterProofSubmit` updates under-review states after proof submission. | RLS must be verified with real host sessions. |
| Admin review case creation | 🟡 Partial / mock | Helper creates deterministic/mock review case behavior where RLS/server path is not available. | Add trusted server action/RPC for persisted case creation. |
| Admin actions | 🟡 Partial / mock | `applyAdminReviewAction` supports approve, more info, reject, and hold payout through server/admin helper with fallback. | Full admin auth and audit ops need production hardening. |
| Proof replacement | 🟡 Partial / mock | Policy, current proof selection, replacement metadata helper, and UI copy exist. | Schema has no version columns; old files are not cleaned up. |
| Proof storage upload | ✅ Done | Real Supabase Storage adapter is available behind config, with mock fallback. | Requires bucket/policy deployment and live storage QA. |

## 5. Storage

| Area | Status | Notes |
| --- | --- | --- |
| Bucket | ✅ Done | `ridepod-proofs` private bucket migration exists with 10MB size and PNG/JPG/PDF MIME allowlist. |
| Storage policies | ✅ Done | Host upload/read scoped to hosted ride instances; admin read; no guest raw preview. |
| Upload adapter | ✅ Done | `uploadProofFile` selects Supabase Storage when configured, otherwise mock. |
| Signed preview | ✅ Done | `createProofSignedUrl` uses short-lived signed URLs, rejects mock/http/public paths. |
| Admin preview | ✅ Done | Admin Review detail uses `ProofPreviewButton`. |
| Host preview | ✅ Done | Host proof/status flow can preview own uploaded proof. |
| Guest preview | ✅ Done | Raw guest proof preview is intentionally not exposed in this MVP. |
| Cleanup | 🟡 Partial / mock | `cleanupOrphanProofFile` placeholder skips real deletion by default. |
| Replacement/version policy | 🟡 Partial / mock | Current proof selection and replacement policy exist; schema cleanup is still needed for explicit version fields. |

## 6. Money Protection Readiness

- ✅ Quote proof controls booking permission.
- ✅ Receipt / meter proof controls settlement readiness.
- ✅ Above-cap proof creates or routes to admin review behavior.
- ✅ Suspicious proof can be manually reviewed when caller state marks it.
- 🟡 Guests cannot silently block settlement forever in copy/state, but production dispute workflow still needs ops rules.
- ✅ Dispute window logic is represented in settlement state and seed/sanity checks.
- ✅ Platform fee copy is guarded by money-safety tests and existing UI copy.
- ✅ No production payment promise is made by this Supabase slice.

## 7. Mock / Manual Areas

- Real Stripe payment authorization/capture remains outside this Supabase integration.
- Real payout and reimbursement sending are not implemented.
- OCR is not implemented.
- AI fraud detection is not implemented and is not trusted as a settlement source.
- Provider APIs are not implemented.
- Real map/route optimization is not implemented.
- Admin review and proof verification remain manual/admin-driven.
- Notification persistence is not implemented; notifications are computed/derived.
- Orphan storage cleanup is a placeholder and does not delete real files by default.
- Storage bucket setup must be verified in the target Supabase project if SQL bucket creation is not applied automatically.

## 8. Closed Beta Readiness

- ✅ App builds.
- ✅ RLS sanity and security query files exist.
- ✅ E2E seed exists.
- ✅ E2E sanity query file exists.
- ✅ My Pods can read Supabase data or fall back to mock data.
- ✅ Ride detail can read Supabase data or fall back to mock data.
- ✅ Proof upload metadata can write to Supabase or fall back to mock behavior.
- 🟡 Admin review can read/write through server/admin helpers or mock fallback; production admin auth still needs verification.
- ✅ Storage preview uses private signed URLs and does not expose public proof files.
- ✅ Service-role key is isolated to server/admin helpers.
- ✅ Risky wording scan found only test/checklist guardrails, not app-facing claims.

## 9. Production Blockers

- Real payment authorization/capture is not implemented.
- Real payout and reimbursement are not implemented.
- Legal, compliance, safety, terms, and privacy review are required.
- Admin role/auth must be verified and protected before production.
- Storage bucket and RLS policies must be tested with real host, guest, unrelated, and admin sessions.
- Chargeback, dispute, and manual review ops processes need an owner and runbook.
- Manual review workload and escalation rules are unknown.
- Proof version schema cleanup is needed for explicit current/superseded history.
- Notification persistence is not implemented.
- Orphan file cleanup is not enabled for real deletion.

## 10. Recommended Next Phase

- Phase 3A — Closed beta demo data polish.
- Phase 3B — Stripe test mode architecture.
- Phase 3C — Manual admin ops playbook.
- Phase 3D — Legal/compliance copy review.

## QA Artifacts

| Artifact | Status | Location |
| --- | --- | --- |
| Supabase schema migration | ✅ Done | `supabase/migrations/202605190001_ridepod_mvp_schema.sql` |
| Supabase RLS migration | ✅ Done | `supabase/migrations/202605190002_ridepod_mvp_rls.sql` |
| Supabase storage migration | ✅ Done | `supabase/migrations/202605190003_ridepod_proof_storage.sql` |
| E2E seed | ✅ Done | `supabase/seed.sql` |
| E2E sanity checks | ✅ Done | `supabase/tests/ridepod_e2e_seed_checks.sql` |
| RLS security QA checks | ✅ Done | `supabase/tests/ridepod_rls_security_checks.sql` |
| Storage policy sanity checks | ✅ Done | `supabase/tests/ridepod_storage_policy_sanity_checks.sql` |
| Supabase client helpers | ✅ Done | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/env.ts` |
| Proof upload adapter | ✅ Done | `src/lib/uploads/proof-upload.ts` |
| Signed URL helper | ✅ Done | `src/lib/uploads/proof-upload.ts` |
| Proof replacement helper | ✅ Done | `src/lib/supabase/proof-metadata.ts` |
| Admin review helpers | ✅ Done | `src/lib/supabase/admin-review-cases.ts`, `src/lib/supabase/admin-review-actions.ts` |

## Last QA Notes

- Supabase CLI was not available in the local environment during recent QA, so SQL files need manual execution in Supabase SQL Editor or a configured local Supabase CLI environment.
- Direct SQL execution as database owner or service role bypasses RLS. Role-based denial checks must be run through normal authenticated Supabase client sessions.
