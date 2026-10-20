# FareEnough V2.2 — automated UX review

Generated: 2026-10-20T16:52:31.530Z (UTC). **PASS — complete package**. This is captured evidence and a product inventory, not an accessibility certification or a pixel-diff baseline.

## Version and reproducibility

- Reviewed UI source commit: [`2f3c9a58406e073febb21288bf3daa06cb889bf7`](https://github.com/tonylo0929/ridepod/commit/2f3c9a58406e073febb21288bf3daa06cb889bf7).
- Generation checkout: `2f3c9a58406e073febb21288bf3daa06cb889bf7`; branch: `feature/ridepod-social-discovery`.
- UI source files modified/untracked at capture: **no**.
- SHA-256 of preview/runtime/global styles/avatar source files: `3385032a32b2dccf89735083ae3f6ef69cf7f2490ea78a82e1565da67fefaaa7`.
- Toolchain: Node v24.14.0, Playwright 1.64.1, Chromium 156.0.8078.4, win32.
- Viewports: mobile **390 × 1100**, desktop **1440 × 1000**, device scale 1, zh-HK locale, Asia/Hong_Kong timezone, reduced motion. PNG viewport captures; modal interiors are scrolled where noted. No content is hidden for screenshots.
- Server demo date anchor(s): 2026-10-21. “今日/聽日” roll forward on future runs. Each run starts a fresh local production build and new isolated contexts; no saved sessions are loaded.
- The package commit necessarily follows the reviewed checkout because generated files cannot contain their own Git hash. The UI source commit/hash above identify what is pictured. CI artifacts record the actual tested checkout.

## Screens and navigation

The product is a passenger-led, Cantonese journey-discovery demo under `/v2-preview`. FareEnough uses mint, cream and warm yellow, route illustrations and animal avatars. Phones use two masonry lanes; desktop uses four.

| Screen | Reach it | Available actions |
| --- | --- | --- |
| Home / airport feed | Default category; 首頁 returns to top | Search text, today/tomorrow, direction, flight filter, sorting; open cards or express interest |
| Airport filters | 篩選 | Date, district, planned companion places, earliest car departure, direction, luggage, waiting and optional flight |
| Popular routes | 熱門路線 tab | Corridors, morning/evening, recurring journeys and shared search/sorting |
| Journey details | Card; sample query `?journey=demo-1` | Route, author, planned group size, interest, meeting/luggage/waiting and independent airport times |
| Create Post — step 1 | 發佈, 分享行程 or 分享下一程 | Essential trip fields; optional flight/exit/luggage/wait/meeting/message disclosure |
| Create Post — step 2 | 幫我寫個帖文 | Review full dates/times, edit title/body, optional cover, back/edit, publish local demo |
| Own journey | Publish, then view; or 我的 | Creator label and local edit; no self-interest action |
| My Journeys | 我的 | Published/interested counts and lists; refresh warning |
| Message shortlist | 訊息 | Revisit interested journeys; text explicitly says real chat is unavailable |

## User journey flows

1. **Find company:** home → airport text/flight search or popular corridor → optional filters → journey details → 我有興趣 → My Journeys / message shortlist. 撤回興趣 removes the local intention.
2. **Share a journey:** 發佈 → essential fields → optional details → generated preview → edit copy/cover → publish → creator-labelled detail → optional local edit → My Journeys. Editing retains the post ID and published count.
3. **Understand airport timing:** arrival details prioritize estimated exit after immigration/bags and planned car departure; the flight schedule stays separate. Outbound sample departs at 21:50 and takes off at 00:17 on the next full date, in Hong Kong time.
4. **Recover:** clear filters from an empty result; Escape closes native dialogs. Refresh resets session activity; a local-post query link then shows an explicit expired-demo notice.

Interest excludes the one host. Maximum planned group size is the host plus advertised companion places. Interest does not consume seats or confirm a booking. Filtering advertised places is independent of interest.

## Mock-only versus live features

| Working in the local demonstration | Not connected to a live service |
| --- | --- |
| Client-side filters/sorting; native modal navigation; optional flight tags; chronology checks; editable template text; cover choice; local create/edit; interest/withdrawal; session-derived lists/counts | Real rider records, identity verification, confirmed seats, booking, driver matching, dispatch, live flight status, real messaging, fares/payments, persistence or cross-device sync |

All fixture people, posts, flight examples and interactions are synthetic. “Live” behavior here means reactive browser UI only. The production app exists elsewhere in this repository and is outside this review. No production/customer pages, auth/account screens or API endpoints are visited. Tests block non-GET/HEAD, non-local, API/auth and unapproved asset requests. No cookies/profile are imported, and no credentials or personal data are entered. Only supplied demo avatar images may use the local Next image optimizer.

## Test results

Run duration: 33.9 seconds. 20/20 curated images; 2702 KiB total; 3 MiB budget **passed**; capture completeness **passed**.

| Test | Status | Duration |
| --- | --- | --- |
| logic: airport/count logic and capture network isolation | passed | 0.1s |
| mobile: curated preview review journeys | passed | 6.8s |
| desktop: curated preview review journeys | passed | 8.0s |

The logic test executes the nine airport/count/copy assertions in `scripts/test-v2-airport-timing.mjs`, plus allow/deny cases for the capture network boundary. Playwright's web server runs `npm run build` (including Next's TypeScript check) before browser tests; a failed build prevents capture. This report does not imply that every production flow or repository test was run.

Both flight inputs are checked with an invalid character and a valid synthetic flight number. The initial review exposed an unescaped hyphen in their HTML pattern under Unicode-aware browsers; the focused V2 fix is included in the reviewed UI source commit. The suite requires zero browser errors and verifies that the pattern rejects invalid input. See the [HTML pattern standard](https://html.spec.whatwg.org/multipage/input.html#the-pattern-attribute).

| Browser flow/assertions | Mobile | Desktop |
| --- | --- | --- |
| Homepage: synthetic feed, responsive masonry and no overflow | passed | passed |
| Airport search: route text and normalized optional flight | passed | passed |
| Airport filters: planned places and district, native-dialog keyboard audit | passed | passed |
| Popular routes: corridor, recurring filter and empty recovery | passed | passed |
| Journey details: arrival/exit/car times, optional flight and Escape | passed | passed |
| Outbound example: car and takeoff keep independent full dates | passed | passed |
| Create step 1: essentials work with optional fields empty | passed | passed |
| Create step 2: preview, edited copy survives back navigation, publish | passed | passed |
| Own journey: local edit updates the same post with no self-interest | passed | passed |
| Interest before/after: add and withdraw without changing capacity | passed | passed |
| My Journeys and message shortlist: real session counts, demo notices | passed | passed |
| Refresh: local posts expire and both activity counters reset | passed | passed |

No horizontal page overflow is required at every capture point. Browser errors observed: **0**. Forbidden network attempts observed: **0**. A forbidden attempt fails the run before publication.

## Accessibility and usability findings

Automated axe scans run at every captured state against WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tags. Findings are reported rather than treated as an accessibility pass gate. Duplicate occurrences across states are counted, not unique UI defects. `incomplete` rules and full element-level findings are in the JSON artifact for human review. No audit rules are silently disabled.

| Automated rule | Impact | Affected captured states | Node occurrences across states | Example selector |
| --- | --- | --- | --- | --- |
| [color-contrast](https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright) | serious | 20 | 208 | .preview-module__t6ileq__compactIntro > div > p |
| [label-content-name-mismatch](https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright) | serious | 6 | 22 | button[aria-label="睇旅程：今晚 CX734 落機，有冇人一齊返屯門？✈️"] |

- **Elements must meet minimum color contrast ratio thresholds:** Fix any of the following: Element has insufficient color contrast of 4.28 (foreground color: #5b7767, background color: #edf1e7, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
- **Elements must have their visible text as part of their accessible name:** Fix any of the following: Text inside the element is not included in the accessible name

- **Touch-size advisory:** mobile “搜尋目的地或旅程” 313×24px; mobile “全部日期” 70×34px; mobile “今日” 46×34px; mobile “聽日” 46×34px These are a small visibility-based sample, not a WCAG target-size conformance result; spacing exceptions and overlap need human assessment. Prefer larger touch areas where practical.
- **Keyboard:** a Tab/Shift+Tab probe asserts that no background control receives focus; Escape is exercised. The native-dialog boundary reached a document/browser focus stop on mobile, desktop; this is not a fully cycling custom focus trap. Check continuity in an interactive browser and with assistive technology. Opener focus restoration needs review on mobile, desktop. A screen-reader session and all focus-order paths were not assessed.
- **Masonry reading order:** DOM/keyboard order follows whole columns, while sighted users may scan rows. Review this with keyboard and screen-reader users; screenshots alone cannot establish a meaningful reading order.
- **Dense mobile cards and scrollable forms:** two columns constrain route/count text. Detail/review screenshots intentionally show scrolled interiors, so some fields remain outside the viewport. Assess legibility, discoverability of optional disclosures and sticky footer behavior with real users and large text/zoom.

## Known limitations and review guidance

- This workflow uses Chromium at two widths, not every browser/device. No pixel equality assertions: OS/CJK fonts, browser updates, current demo dates and rendering can alter images. CI installs CJK fonts; Windows and Linux may render differently.
- Source-driven labels and synthetic fixture routes are intentional test contracts. If the product's screens or accessible names change, update the scenarios and this product inventory rather than weakening assertions.
- Captures are viewport images, not exhaustive full-page composites. Use the report's flow descriptions, the local UI and test traces to inspect content beyond the fold.
- Automated checks cannot establish overall usability or accessibility. Check incomplete axe results, keyboard reading order, contrast context, zoom, screen readers and comprehension with people. A passing interaction suite can still have the listed accessibility findings.
- Demo state disappears on refresh, including interests and created/edited posts; local links then expire. No live customer or production integration is tested. Preview deployment may require authorised Vercel sign-in; this package is generated locally and does not depend on that login.
- The last complete passing package is retained if a later run fails or is partial. Check this report's timestamp/commit against the PR and inspect the latest Actions artifact before assuming it describes newer code. The workflow uploads current failure evidence and never commits generated changes automatically.

## Regenerate and inspect

See [README](README.md) for setup, safety boundary, CI artifacts and how another AI should review this package. Run `npm run ux:review` after installing dependencies and Chromium. Extensive results, per-element audits, HTML output and failure traces remain in ignored directories and short-lived Actions artifacts.

## Screenshot gallery

Click an image for its native resolution. The 20-image limit covers ten states at both widths; only these PNGs and this report are intended for source control.

| State / context | Mobile · 390px | Desktop · 1440px |
| --- | --- | --- |
| **Homepage and masonry feed**<br>Default airport feed, with route/date, optional flight, independent interest and capacity, and author. | [![Homepage and masonry feed — mobile](screenshots/mobile-01-homepage.png)](screenshots/mobile-01-homepage.png) | [![Homepage and masonry feed — desktop](screenshots/desktop-01-homepage.png)](screenshots/desktop-01-homepage.png) |
| **Airport search**<br>Destination search plus a normalized `cx 734` flight filter; one synthetic matching journey. | [![Airport search — mobile](screenshots/mobile-02-airport-search.png)](screenshots/mobile-02-airport-search.png) | [![Airport search — desktop](screenshots/desktop-02-airport-search.png)](screenshots/desktop-02-airport-search.png) |
| **Airport filters**<br>Advanced filters with a district and planned companion places; these are not confirmed remaining seats. | [![Airport filters — mobile](screenshots/mobile-03-airport-filters.png)](screenshots/mobile-03-airport-filters.png) | [![Airport filters — desktop](screenshots/desktop-03-airport-filters.png)](screenshots/desktop-03-airport-filters.png) |
| **Popular routes**<br>The 屯門 → 中環 corridor; both one-off and recurring demo journeys are discoverable. | [![Popular routes — mobile](screenshots/mobile-04-popular-routes.png)](screenshots/mobile-04-popular-routes.png) | [![Popular routes — desktop](screenshots/desktop-04-popular-routes.png)](screenshots/desktop-04-popular-routes.png) |
| **Arrival journey details**<br>Scrolled to the host/interest information, distinct exit/car/flight dates and demo disclaimer. | [![Arrival journey details — mobile](screenshots/mobile-05-journey-details.png)](screenshots/mobile-05-journey-details.png) | [![Arrival journey details — desktop](screenshots/desktop-05-journey-details.png)](screenshots/desktop-05-journey-details.png) |
| **Create Post — step 1**<br>Essential fields first; optional trip details are collapsed. | [![Create Post — step 1 — mobile](screenshots/mobile-06-create-step-1.png)](screenshots/mobile-06-create-step-1.png) | [![Create Post — step 1 — desktop](screenshots/desktop-06-create-step-1.png)](screenshots/desktop-06-create-step-1.png) |
| **Create Post — preview**<br>Synthetic airport timings, planned capacity, optional cover and editable Cantonese copy. The form continues vertically. | [![Create Post — preview — mobile](screenshots/mobile-07-create-step-2.png)](screenshots/mobile-07-create-step-2.png) | [![Create Post — preview — desktop](screenshots/desktop-07-create-step-2.png)](screenshots/desktop-07-create-step-2.png) |
| **Interest — before**<br>Another person's journey: zero interested people, maximum planned group of four, and 我有興趣. | [![Interest — before — mobile](screenshots/mobile-08-interest-before.png)](screenshots/mobile-08-interest-before.png) | [![Interest — before — desktop](screenshots/desktop-08-interest-before.png)](screenshots/desktop-08-interest-before.png) |
| **Interest — after**<br>The same viewport after interest: one interested person, capacity still four, and 撤回興趣. | [![Interest — after — mobile](screenshots/mobile-09-interest-after.png)](screenshots/mobile-09-interest-after.png) | [![Interest — after — desktop](screenshots/desktop-09-interest-after.png)](screenshots/desktop-09-interest-after.png) |
| **My Journeys**<br>One local published journey and one interested journey, with the refresh warning. | [![My Journeys — mobile](screenshots/mobile-10-my-journeys.png)](screenshots/mobile-10-my-journeys.png) | [![My Journeys — desktop](screenshots/desktop-10-my-journeys.png)](screenshots/desktop-10-my-journeys.png) |
