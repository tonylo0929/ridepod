# FareEnough V2.3 preview handover

Updated: 22 October 2026, Hong Kong time.

The public preview brand is **FareEnough** with the tagline **同路就夾，車費齊齊慳。** The repository, branch, Vercel project and production experience retain their existing names. V2.3 refines the isolated prototype's accessibility/usability and its review workflow.

## V2.3 review outcome

- Detail-cover correction: only the journey-detail renderer opts into SVG containment (`meet`); homepage/card/creation covers keep the default `slice` behavior. The detail cover uses at most 320px / 36dvh, with the label in a separate row. All nine illustrations are checked at mobile/desktop widths for full artwork, uniform scale, bounded height and no badge/close-button obstruction. The detail screenshot now shows the top; eighteen extra cover captures stay in Actions artifacts. No full-cover viewer is needed because the whole illustration is already visible.

- Read PR #1's available discussion: only the Vercel bot deployment comment was present. The owner's pasted V2.3 review is the implementation brief.
- P0 first: darker green secondary text/disclaimers on the existing pastel surfaces, stronger input boundaries/focus indicators, and natural card button names matching visible content. Expanded cover-choice testing exposed additional visible-name mismatches; removing their redundant overrides fixes those too. Axe rules are never disabled/excluded. Contrast and label/name mismatches now fail the reusable review command.
- P1: cards keep route, departure, optional flight, interest and host-inclusive planned capacity; post title/body are in details. Common airport filters use clearer Cantonese and shorter choices, with an explicit non-booking places note; advanced timing/luggage/wait/flight fields are optional. Mobile quick filters wrap and common touch controls have 44px areas.
- Step 2 shows a compact cover/route/full-date car-departure summary, then editable Cantonese copy. Full independent airport dates/times, flight editing and nine covers remain available in disclosures. The publish control stays in normal flow and is tested as visible/unobscured at both capture sizes. Step transitions focus the heading and return to the top.
- P2 evidence and repairs: the previous column DOM traversed whole lanes and Escape did not restore the card opener. A flat sparse row-flow grid now measures card heights while retaining 2/3/4 columns and source order. Regressions compare visual/source order, Tab progression, non-overlap and responsive widths. Modal Tab/Shift+Tab explicitly cycle and cleanup restores a connected opener, with a main-navigation fallback when that opener was removed. Replacement dialogs retain focus.
- Regenerate the [20-image UX report](ux-review/UX-REPORT.md) with `npm run ux:review`. It includes expanded filter/cover audits, source identity and remaining limitations; full diagnostics stay in Actions artifacts. Production authentication, records, database, payment and dispatch are untouched. Existing airport timing/count/copy logic is unchanged.
- **Remaining human work:** incomplete contrast checks over decorative SVGs/overlapping elements, real screen-reader comprehension, native zoom/text resizing and broader browser/input coverage. The [five-person usability-test package](ux-review/USABILITY-TEST.md) is prepared at the owner's request. Sessions have not been conducted; recruit real participants and resolve critical findings before adding features.

## Open and review

- Preview: https://ridepod-git-feature-ridepod-social-8e15af-tonylo0929s-projects.vercel.app/v2-preview
- Repository: https://github.com/tonylo0929/ridepod
- Branch: `feature/ridepod-social-discovery`
- Draft PR: https://github.com/tonylo0929/ridepod/pull/1
- Production branch: `master`; starting commit `67807b3`.

Vercel's existing GitHub integration deploys this feature branch as a Preview. The branch URL follows subsequent deployments. Vercel Deployment Protection currently redirects unauthenticated visitors to Vercel sign-in. Use the account that owns, or has authorised access to, the RidePod Vercel project. If a different office account lacks access, the project owner must grant it through the normal Vercel access workflow. Security protections have not been disabled.

The hosted preview remains available when the home computer is off. Viewing needs no local installation. Do not merge the PR, promote a deployment, or publish V2 to production without the owner's explicit approval.

## Existing project inspected

The existing app uses Next.js 16.2.6 App Router, React 19.2.4, TypeScript, Tailwind 4, Lucide icons, and npm. Application routes are under `src/app/(app)` with a shared AppShell; creation/detail flows use existing ride components, `HomeRide` data and local state helpers. Supabase provides authentication, profile storage and API-backed pod features. Stripe and mapping dependencies already exist. Deployment settings are in `vercel.json`, with the existing linked Vercel project named `ridepod`.

V2 uses the same app and dependencies. It does not replace `/home`, change the database schema, change authentication logic, or connect the new UI to production ride records.

## Completed prototype

- V2.2 separates the host (one person), advertised companion places, maximum planned group size (host plus companion places), and expressions of interest. Interest excludes the host and is never subtracted from capacity. There is no confirmed-participant or remaining-seat model. The same `journeyCounts` helper and `JourneyInterest` component serve feed cards, details and My Journeys. Interest may exceed the planned group size without creating a booking or blocking further interest.
- Group-size filtering/sorting uses advertised companion places, independent of interest. Active luggage/waiting filters exclude journeys with missing information; inactive filters retain them.
- Own posts have an explicit creator label and no interest/heart action. Their detail view offers local editing through the existing two-step form. Saving updates the same ID, preserves the interest baseline and avoids duplicate posts. Other posts offer **我有興趣** / **撤回興趣**, with a clear explanation that interest does not confirm a booking.
- My Journeys shows only published and interested journey counts, calculated from the available session state. The decorative HK statistic is removed. Refresh warnings remain visible.
- Responsive social discovery: two masonry columns on phones, three on tablets, four on desktop. V2.3 replaces whole-column DOM groups with flat source-ordered cards and measured grid spans; sparse row flow avoids visual/source reordering and overlap.
- The intro is reduced from roughly 208px to 72px on mobile, with a simple typographic FareEnough wordmark. Routes use 13–14px mobile text; flight badges and departure times use 13px. Interest counts and authors use 12px. The mint, cream and warm yellow palette is retained.
- Cantonese journey cards prioritize origin/destination, Hong Kong-relative departure date/time, optional flight, independent interest/group counts and author. Luggage, waiting tolerance and airport-exit details live in the detail view to reduce mobile clutter.
- Airport discovery: equal-width **✈️ 準備飛啦！ — 去機場** and **🧳 落機返屋企！ — 由機場出發** buttons replace the old direction chips inside 機場同路. Native pressed states, selected checkmarks and keyboard activation share the existing direction state with the filter dialog. Switching preserves text/date/flight/advanced filters; tapping the selected direction again restores both directions. Main 機場同路 / 熱門路線 navigation is unchanged. Date, district, planned companion places, earliest shared-car departure, waiting, luggage and optional flight filters remain available.
- Popular corridors, today/tomorrow, morning/evening, recurring journeys and sorting.
- Optional flight badges are prominent on feed cards, details and the publishing preview. A direct flight filter accepts lowercase and spaces (for example `cx 734`). Blank flight numbers produce no badge and no fabricated schedule.
- Journey details in a native accessible modal, with query-addressable sample journeys (for example `/v2-preview?journey=demo-1`). Three separate structured fields represent scheduled flight arrival/takeoff, expected airport exit and planned shared-car departure. Timelines and creation reviews show the full date, year and 24-hour time for each event, with a Hong Kong time note. Arrivals prioritize exit and car departure; outbound trips show car departure before scheduled takeoff. `demo-3` illustrates departure today at 21:50 and takeoff tomorrow at 00:17; anchored to 21 October 2026, these display 21 and 22 October respectively. Changing the car date does not silently move the flight/exit dates. Chronology is validated even when the optional exit time is absent. No field claims live flight information.
- Add/withdraw demo interest, consistent counts, message-centre shortlist and My journeys.
- Two-step creation keeps essential type/direction, route, car departure date/time and companion places upfront. An optional disclosure contains flight number/schedule, airport exit, luggage, waiting tolerance, meeting point and message. Optional fields start empty, including airport exit; generated text does not fabricate missing luggage/waiting/exit information. Covers are automatically selected, with all nine original illustrations available in an optional chooser. No external images or APIs are required.
- Flight numbers can be edited at both creation steps. Untouched generated title/description track preview flight edits; custom wording is preserved.
- Going back to step one and returning to review preserves custom title/body text. Explicit regeneration warns that it replaces the current copy. Flight-based arrival titles avoid assigning the car departure date to the flight's landing date.
- Loading skeleton, recoverable route error boundary, invalid/expired demo-link notice, empty-state recovery, keyboard tabs, native modal focus trapping/Escape dismissal and reduced-motion styles.

Everything is clearly labelled as a demo. Posts and interests exist in React memory only, on the current page. Reloading clears them; there is no cross-device sync of demo content. A newly created post's query link stops resolving after reload and shows an explicit notice. No real messages, bookings, dispatch, payments, user uploads, flight tracking, or live matching have been added.

## Isolation and reuse

`RouteRuntime` chooses the original AuthProvider/SplashScreen for all existing routes. It bypasses those components only for `/v2-preview` and its descendants. This matters because the original auth boot can initialise a Supabase profile; simply avoiding `useAuth` inside V2 would not isolate that mount-time behaviour.

V2 has no fetch calls, API routes, database clients, production record imports, secret reads, or storage writes. Its only shared journey dependency is a type-only import. Illustrations are original SVG route postcards rendered locally, with a generic harbour fallback; author animal-avatar assets are reused through Next Image. Production dependencies are unchanged; development-only Playwright/axe tooling and a read-only CI workflow support automated review.

## Changed files

| File | Purpose |
| --- | --- |
| `src/app/layout.tsx` | Replaces the existing provider/splash wrapping with the route-aware boundary. |
| `src/components/route-runtime.tsx` | Preserves the existing runtime and isolates V2. |
| `src/app/v2-preview/page.tsx` | Preview route, metadata/noindex and Hong Kong date anchor. |
| `src/app/v2-preview/data.ts` | Typed sample journeys, date helpers, cover assignment and Cantonese templates. |
| `src/app/v2-preview/airport-info.tsx` | Shared optional flight badge and separate flight/exit/car-departure timeline. |
| `src/app/v2-preview/journey-interest.tsx` | Shared interest and planned-capacity presentation. |
| `src/app/v2-preview/discovery.tsx` | Feed, filters, detail, navigation, interest, profile and message shortlist. |
| `src/app/v2-preview/create-post.tsx` | Structured creation, validation, editable copy and cover choices. |
| `src/app/v2-preview/masonry.tsx` | Flat source order and measured sparse grid spans. |
| `src/app/v2-preview/modal.tsx` | Native dialog, explicit keyboard cycling, focus restoration and scroll handling. |
| `src/app/v2-preview/route-cover.tsx` | Nine original SVG cover scenes; no external assets. |
| `src/app/v2-preview/preview.module.css` | Scoped V2 styling; no changes to global CSS. |
| `src/app/v2-preview/loading.tsx` | Loading state. |
| `src/app/v2-preview/error.tsx` | Recoverable error state. |
| `docs/ridepod-v2-handover.md` | This cross-device implementation and continuation guide. |
| `scripts/test-v2-airport-timing.mjs` | Nine checks for times/dates, optional data, generated copy and independent host/interest/capacity calculations. |

## Validation

The reusable [automated UX review package](ux-review/UX-REPORT.md) records the reviewed UI commit/hash, screenshots, flows, current tests and accessibility findings. Set up with `npm ci` and `npx playwright install chromium`, then run `npm run ux:review`. Read [the workflow guide](ux-review/README.md) for its synthetic-data/network boundary and Actions artifacts. It captures ten states at 390px and 1440px, without changing the product. Automated findings and keyboard boundary observations are review evidence; a passing interaction suite is not an accessibility certification.

- `npm run build`: passed, including TypeScript and generation of existing routes.
- `npx tsc --noEmit`: passed.
- `node --experimental-strip-types scripts/test-v2-airport-timing.mjs`: 9 passed. Node may emit an informational module-type warning; no package configuration was changed merely to suppress it.
- `npm run lint`: zero errors; 44 existing unused-variable warnings in production files outside this change. Focused ESLint on V2 and its logic tests passes with `--max-warnings 0`.
- HTTP smoke checks: `/v2-preview`, `/home?tab=one_off`, `/create/scheduled` and `/pods` returned 200 locally.
- Browser checks passed: airport details, distinct arrival/exit times, interest/count updates, message shortlist, popular corridor selection, recurring filter, airport district/direction filter, no-result search/recovery, generated-copy editing, cover choice, publishing a demo journey and finding it under My journeys.
- V2.2 browser checks cover distinct arrival/exit/car times, full cross-midnight dates in review and details, outbound/arrival validation, independently edited dates, creation without optional fields, custom text surviving back/forward navigation, own-post edit/save without duplicate counting, no self-interest button, other-post interest/withdrawal, matching counts in My Journeys, optional flight tags/filtering, planned-place filtering, cover choice, recurring journeys, empty recovery and expired local links after refresh.
- Responsive checks passed at requested viewport widths 320, 390, 900 and 1440: 2/2/3/4 lanes, no horizontal page overflow. Browser reserves a scrollbar, so measured content widths are slightly smaller.
- No browser console errors observed from the new UI.
- Vercel Preview deployment is checked through GitHub commit/deployment status after pushing. The final delivery note records the exact commit and immutable Preview URL. Anonymous requests reach Vercel's authentication gate, so protected remote content cannot be independently checked without an authorised Vercel session. Local route and interaction checks are separate from this deployment status check.

The existing app's entire authenticated journey/payment flow has not been retested against production data. Its implementation files, API logic and database/auth configuration are untouched. No claim is made that the prototype verifies real seats, fares, flight information or rider identities.

## Continue on the office notebook

First open the hosted preview URL above and sign into the authorised Vercel account if requested. To develop, open a local checkout of this repository on the office notebook. For a fresh checkout:

```sh
git clone --branch feature/ridepod-social-discovery https://github.com/tonylo0929/ridepod.git
cd ridepod
npm ci
npm run dev
```

If the repo already exists on that notebook, preserve any uncommitted work, fetch origin, switch to `feature/ridepod-social-discovery`, and pull with `--ff-only`. Open that repository folder in Codex. Future commits pushed to this branch trigger updated Vercel previews. No production credentials are needed to exercise the V2 demo route.

Git syncs committed source and these notes; it does not move this running local process or its in-memory browser demo state. This local Codex session has not been transferred to the office notebook. Remote control of the home host still executes there; do not depend on it if the home computer will be switched off. See the [official OpenAI Remote guidance](https://developers.openai.com/blog/mastering-codex-remote-for-engineering).

Paste this into a new Codex chat opened in the office repository:

> Continue FareEnough V2.2 in `tonylo0929/ridepod`, branch `feature/ridepod-social-discovery`, draft PR #1. Read `AGENTS.md` and `docs/ridepod-v2-handover.md` first. Public branding is FareEnough only inside `/v2-preview`. Host, interest and advertised group capacity are independent; there are no confirmed passengers or computed remaining seats. Flight schedule, optional airport exit and car departure have independent Hong Kong dates/times. The two-step form supports local edits and optional extras; custom copy survives back navigation. Demo data lives in memory and clears on refresh. Production auth/profile boot is bypassed only on the preview route. The preview is https://ridepod-git-feature-ridepod-social-8e15af-tonylo0929s-projects.vercel.app/v2-preview and may require authorised Vercel sign-in. Preserve the branding, palette and mobile masonry; keep working on this feature branch. Push completed changes for Vercel Preview. Do not rename the repository/Vercel project, merge, promote, change production data/auth/schema, or deploy to production without my explicit approval. Ask me what design changes I want next.
