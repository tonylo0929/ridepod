# RidePod V2 preview handover

Updated: 20 October 2026, Hong Kong time.

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

- Responsive social discovery: two masonry lanes on phones, three on tablets, four on desktop. Lane assignment preserves row-wise post ordering and avoids an empty desktop column after publishing an additional post.
- Cantonese journey cards with structured origin/destination, Hong Kong-relative dates, departure time, interest counts, luggage, author avatars and a detail action.
- Airport discovery: arrivals/departures, date, district, group size, earliest ready/departure time, waiting tolerance, luggage and optional flight filter.
- Popular corridors, today/tomorrow, morning/evening, recurring journeys and sorting.
- Journey details in a native accessible modal, with query-addressable sample journeys (for example `/v2-preview?journey=demo-1`). Scheduled flight arrival and expected immigration/baggage exit time are displayed separately. Different flights can still match conceptually.
- Add/withdraw demo interest, consistent counts, message-centre shortlist and My journeys.
- Two-step structured post creation; template-generated editable Cantonese title/description; optional message/meeting point/flight; auto-selected cover and six selectable original cover illustrations.
- Loading skeleton, recoverable route error boundary, invalid/expired demo-link notice, empty-state recovery, keyboard tabs, native modal focus trapping/Escape dismissal and reduced-motion styles.

Everything is clearly labelled as a demo. Posts and interests exist in React memory only, on the current page. Reloading clears them; there is no cross-device sync of demo content. A newly created post's query link stops resolving after reload and shows an explicit notice. No real messages, bookings, dispatch, payments, user uploads, flight tracking, or live matching have been added.

## Isolation and reuse

`RouteRuntime` chooses the original AuthProvider/SplashScreen for all existing routes. It bypasses those components only for `/v2-preview` and its descendants. This matters because the original auth boot can initialise a Supabase profile; simply avoiding `useAuth` inside V2 would not isolate that mount-time behaviour.

V2 has no fetch calls, API routes, database clients, production record imports, secret reads, or storage writes. Its only shared journey dependency is a type-only import. Illustrations are original SVG route postcards rendered locally, with a generic harbour fallback; author animal-avatar assets are reused from the existing project through Next Image. No random photo hotlinks, image-generation service, new dependency, or infrastructure was introduced.

## Changed files

| File | Purpose |
| --- | --- |
| `src/app/layout.tsx` | Replaces the existing provider/splash wrapping with the route-aware boundary. |
| `src/components/route-runtime.tsx` | Preserves the existing runtime and isolates V2. |
| `src/app/v2-preview/page.tsx` | Preview route, metadata/noindex and Hong Kong date anchor. |
| `src/app/v2-preview/data.ts` | Typed sample journeys, date helpers, cover assignment and Cantonese templates. |
| `src/app/v2-preview/discovery.tsx` | Feed, filters, detail, navigation, interest, profile and message shortlist. |
| `src/app/v2-preview/create-post.tsx` | Structured creation, validation, editable copy and cover choices. |
| `src/app/v2-preview/masonry.tsx` | Responsive masonry lane distribution. |
| `src/app/v2-preview/modal.tsx` | Native accessible dialog and scroll handling. |
| `src/app/v2-preview/route-cover.tsx` | Six original SVG cover scenes; no external assets. |
| `src/app/v2-preview/preview.module.css` | Scoped V2 styling; no changes to global CSS. |
| `src/app/v2-preview/loading.tsx` | Loading state. |
| `src/app/v2-preview/error.tsx` | Recoverable error state. |
| `docs/ridepod-v2-handover.md` | This cross-device implementation and continuation guide. |

## Validation

- `npm run build`: passed, including TypeScript and generation of existing routes.
- Focused ESLint: passed with zero warnings/errors for V2, the runtime boundary and root layout.
- HTTP smoke checks: `/v2-preview`, `/home?tab=one_off`, `/create/scheduled` and `/pods` returned 200 locally.
- Browser checks passed: airport details, distinct arrival/exit times, interest/count updates, message shortlist, popular corridor selection, recurring filter, airport district/direction filter, no-result search/recovery, generated-copy editing, cover choice, publishing a demo journey and finding it under My journeys.
- Responsive checks passed at requested viewport widths 320, 390, 900 and 1440: 2/2/3/4 lanes, no horizontal page overflow. Browser reserves a scrollbar, so measured content widths are slightly smaller.
- No browser console errors observed from the new UI.
- Initial Vercel deployment reported Ready/success. Anonymous requests reach Vercel's authentication gate, so protected remote content cannot be independently checked without an authorised Vercel session. Local route and interaction checks are separate from this deployment status check.

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

> Continue RidePod V2 in `tonylo0929/ridepod`, branch `feature/ridepod-social-discovery`, draft PR #1. Read `AGENTS.md` and `docs/ridepod-v2-handover.md` first. The social discovery prototype is isolated at `/v2-preview`, uses in-memory demo data, and bypasses the production AuthProvider only on that route. The preview is https://ridepod-git-feature-ridepod-social-8e15af-tonylo0929s-projects.vercel.app/v2-preview and may require authorised Vercel sign-in. Preserve existing functionality and keep working on this feature branch. Push completed changes for Vercel Preview. Do not merge, promote, change production data/auth/schema, or deploy to production without my explicit approval. Ask me what design changes I want next.
