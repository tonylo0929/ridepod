# RidePod Pre-Tester Smoke QA Report

## Summary

- Overall status: Ready with caution
- Date: 2026-06-02
- Checks run: route HTTP smoke, representative pod detail smoke, risky wording search, privacy wording search, business model copy spot checks, TypeScript, lint, and production build.
- Main risks found: a small privacy fallback could show a user's email in pod activity/confirmation copy; one settlement page still used older beta/test payment wording.
- Fixes applied: changed pod activity and ride app acknowledgement fallback names to display-name-safe copy, and changed settlement copy to "Mock/demo payment states only. No live payment or payout is enabled."
- Remaining limitations: mock/local data only; no live payment; no real taxi dispatch; no real ride app booking; no real payout; no backend chat persistence; no live GPS; no production pricing persistence; static/mock timers remain in demo states.

## P0 blockers

None found.

## P1 issues

None found in the smoke scope.

## P2 issues

- Browser screenshot/click-through verification was not available in this run, so mobile visual polish was checked through route output, source review, and build safety rather than pixel inspection.
- Some settlement routes are backed by `mock-data` pod IDs, while Home ride IDs are backed by `home-ride-mock`. Directly guessing a Home ride settlement URL can 404, but the known tester settlement route `/pods/usc-lax-001/settlement` opens successfully.

## Checks Run

1. Core app routes opened with HTTP 200: `/`, `/home`, `/create`, `/pods`, `/chats`, `/profile`, `/membership`, `/support`, `/how-it-works`, `/faq`, `/about`, `/admin/pricing`, `/taxi-partner`, `/register`.
2. Representative pod routes opened with HTTP 200: normal taxi, airport taxi, recurring taxi, quote-ready taxi, ready-for-pickup taxi, ride app self-settle, self-settle chat, My Ride date page, and settlement demo route.
3. Risky wording search found only allowed avoid-list examples in the business model doc after fixes.
4. Privacy wording search confirmed public-facing copy repeatedly states private details are not shown publicly; one email fallback was fixed.
5. Business model wording checked across create flow, pod detail, admin pricing, membership, support, and docs.

## Bugs Found

- Pod join/cancel persistence used `currentUser.email` as an activity display fallback.
- Ride app booking acknowledgement used `user?.email` as a rider-name fallback.
- Settlement page used "Beta uses mock/test payment states" wording.

## Bugs Fixed

- Activity persistence now uses profile display/preferred name fallback copy instead of email.
- Ride app booking acknowledgement now uses ride/profile display name fallback copy instead of email.
- Settlement copy now says "Mock/demo payment states only. No live payment or payout is enabled."

## Files Changed

- `src/components/pod-detail-join-state.tsx`
- `src/components/settlement-page.tsx`
- `docs/ridepod-pre-tester-smoke-qa-report.md`

## Route/Navigation Status

Pass with caution. Core routes and representative detail routes return 200 on the local dev server. The smoke did not include full browser click-through or visual screenshots.

## Home/Discover Status

Pass. Home route opens, Home mock cards include separate taxi and ride app language, and previous business-model QA confirms ride app cards use RidePod fee / self-settle copy while taxi cards use quote language.

## Create Taxi Status

Pass by source/build smoke. Taxi create copy keeps taxi partner quote separate, no live payment or dispatch wording, and host creation remains free by default.

## Create Ride App Self-Settle Status

Pass by source/build smoke. Create flow uses Ride app / Self-settle wording, ride fare paid outside RidePod, no fare protection, no screenshot/receipt proof, no live payment, free to create, and joined riders may see a RidePod join fee.

## Taxi Pod Detail Status

Pass. Normal taxi, quote-ready taxi, ready-for-pickup taxi, airport taxi, and recurring taxi representative pages returned HTTP 200.

## Ride App Pod Detail Status

Pass. Ride app self-settle pod detail and chat routes returned HTTP 200. Copy states ride fare is paid outside RidePod and RidePod join fee is separate from ride fare.

## My Ride Calendar Status

Pass. `/pods` and `/pods/date/2026-06-02` returned HTTP 200. Status labels are human-readable in the mock calendar source.

## Chats Status

Pass. `/chats` and representative pod chat routes returned HTTP 200. Chat copy avoids private contact details and states mock/no-live-payment boundaries where relevant.

## Membership Status

Pass. `/membership` returned HTTP 200. Plus preview copy includes no live subscription/payment and the disclaimer that Plus does not guarantee ride, taxi partner, refund, route change, or fare outcome.

## Admin Pricing Status

Pass. `/admin/pricing` returned HTTP 200. Copy says mock settings only, no live payment or billing, and waivers cover RidePod join fees only.

## Info Pages Status

Pass. `/how-it-works`, `/faq`, and `/about` returned HTTP 200. Business model doc exists and matches the current mock/demo revenue rules.

## Pricing/Business Wording Status

Pass. Risky wording search found only allowed avoid-list examples in `docs/ridepod-business-model-fee-rules.md`. App copy uses RidePod fee / RidePod join fee, ride fare separate, taxi partner quote separate, and no live payment/payout wording.

## Privacy Status

Pass with fix applied. Public-facing copy says private details such as phone, email, gender identity, ID review, admin notes, and safety reports are not shown publicly. Email display fallbacks in pod activity/ride app acknowledgement were replaced with display-name-safe fallbacks.

## Mobile Readability Status

Ready with caution. Source review and route smoke did not identify route-level crashes or oversized legal-wall copy in affected surfaces, but browser screenshot verification was not available in this run.

## Tests Result

- `npx.cmd tsc --noEmit`: Pass.
- `npm.cmd run lint`: Pass with 21 existing unused-code warnings in `src/app/(app)/home/page.tsx` and `src/components/create-pod-choose-type.tsx`.
- `npm.cmd run build`: Pass.

## Remaining Limitations

- Mock/local data only.
- No live payment.
- No real taxi dispatch.
- No real ride app booking.
- No real payout.
- No backend chat persistence.
- No live GPS.
- No production pricing persistence.
- Static/mock timers remain in demo states.

## Recommendation

Ready with caution.
