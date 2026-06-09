# RidePod Final QA 2 Report

## Summary

- Overall status: Ready with caution
- Date: 2026-06-03
- Checks run: mobile browser route smoke, representative Taxi and Ride app pod detail smoke, Create wizard guest/login click-through, Launch waiver/Plus/Support interaction smoke, self-settle status/chat copy checks, risky wording search, privacy wording search, business model doc check, TypeScript, lint, and production build.
- Main risks found: several Ride app self-settle detail states still reused Taxi Partner Quote wording; one fallback self-settle helper implied "Pay HK$5 to join"; recurring and airport Ride app pages showed quote/status language; a review status line used payment-verb copy for second-fee handling.
- Fixes applied: added Ride app-specific route/status/helper copy in normal, recurring, and airport pod detail surfaces; corrected the fallback join-fee timing copy; added Ride app airport How-it-works steps; removed second-fee payment-verb wording.
- Remaining limitations: mock/local data only; no live payment; no real taxi dispatch; no real ride app booking; no real payout; no backend chat persistence; no live GPS; no production pricing persistence; static/mock timers remain; no real screenshot upload backend; no real seat-release persistence.

## P0 blockers

None found.

## P1 issues

- Fixed: Ride app one-off/recurring/airport detail pages could show Taxi Partner Quote language, which could confuse testers about whether RidePod was arranging a taxi quote for self-settle pods.
- Fixed: a fallback Ride app helper said "Pay HK$5 to join," conflicting with the rule that initial join is interest / seat hold only and the RidePod fee is handled at ride-detail confirmation.

## P2 issues

- Fixed: recurring Ride app CTA helper used "Final share appears after each taxi partner quote."
- Fixed: airport Ride app detail showed "Quote status," "included in the quote," and taxi How-it-works steps.
- Fixed: review/update status copy said riders "do not pay a second RidePod fee"; changed to "No second RidePod fee applies."

## Remaining limitations

- Mock/local data only.
- No live payment.
- No real taxi dispatch.
- No real ride app booking.
- No real payout.
- No backend chat persistence.
- No live GPS.
- No production pricing persistence.
- Static/mock timers are still used for countdown and deadline scenarios.
- No real screenshot upload backend.
- No real seat-release persistence.
- Create flow requires login; the smoke used local demo auth behavior.
- Some legacy/internal payment and settlement files still contain payment/refund/proof terminology outside the Ride app self-settle final-confirmation scope.

## Recommendation

Ready with caution.
