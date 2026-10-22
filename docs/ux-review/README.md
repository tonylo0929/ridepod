# FareEnough UX review package

Start with [UX-REPORT.md](UX-REPORT.md). It contains the product inventory, flows, actual test/audit results, UI source commit/hash and a gallery of 20 PNGs with relative image links. All data is synthetic. GitHub renders this package directly from the draft PR branch; reviewers do not need a local installation or Vercel login to see the committed evidence.

## Regenerate

Use Node 24 and the locked npm dependencies. From the repository root:

```sh
npm ci
npx playwright install chromium
npm run ux:review
```

On a Linux machine missing browser libraries, use `npx playwright install --with-deps chromium` and install CJK fonts (for example `fonts-noto-cjk`). The Actions workflow handles both. After initial setup, **`npm run ux:review`** is the reusable command. It builds the app, starts a fresh server on `127.0.0.1:3044`, executes the logic/safety test and the two browser journeys, scans accessibility, generates the report and publishes the curated images when all captures pass. It stops its owned server when done. It does not reuse an existing server; if the port is occupied, choose another local port with `FAREENOUGH_UX_PORT`.

PowerShell example:

```powershell
$env:FAREENOUGH_UX_PORT = '3045'
npm run ux:review
```

No remote/base-URL override, login, database or production credentials are needed or accepted. The older `npm run screenshots` command is separate: it captures historical `/designs/*` pages and does not produce this review.

To inspect the local HTML test report:

```sh
npm run ux:review:open
```

Use `npm run ux:review -- --project=mobile` for a partial diagnostic run. Partial/failed runs write their current report under `test-results/ux-review/package/` and leave the last complete curated package intact. Only an all-project passing run with all 20 images and total PNG size at most 4 MiB replaces `docs/ux-review/UX-REPORT.md` and the generator-owned `screenshots/mobile-*.png` / `desktop-*.png` files. The limit allows for Windows/Linux font differences and is a binary-size guard, not a visual-quality score.

## What is exercised

- Homepage/masonry source/visual/keyboard order, airport destination and flight search, common/advanced filters and cycling Tab/Shift+Tab dialog boundaries (body/background focus stops fail).
- Popular corridors, recurring filter, empty results and clear-filter recovery.
- Arrival details, separate flight/exit/car times, blank flight tags and an overnight outbound example.
- Essential-only creation, optional chronology validation, preview, editable Cantonese copy retained on back navigation, publishing, own-post editing without duplicates or self-interest.
- Other-post interest before/after, withdrawal, capacity independence, My Journeys and message shortlist.
- Refresh reset and explicit recovery for an expired local-post link.
- All nine cover choices in journey details at 390×844 mobile and 1440×1000 desktop: full ViewBox visible, uniform scale, bounded height, unobstructed artwork and unchanged feed crop mode. Eighteen extra per-cover screenshots remain in the ignored results / Actions artifact; the curated package stays at 20 images.

The suite asserts interaction behavior, page overflow, masonry columns/order/non-overlap, keyboard cycling and opener restoration, browser errors and the network boundary. Each capture and the expanded filter/cover states run axe scans. **Color contrast and visible-label/name mismatches fail the run**; no rules are disabled/excluded. Other findings and incomplete rules are reported for review. A green workflow confirms these tested contracts, not overall WCAG conformance. No automated audit can replace screen-reader, zoom, keyboard and user-comprehension reviews. Use the [five-person usability-test package](USABILITY-TEST.md) before adding features; its sessions and results are pending real participants.

## Evidence and retention

- Commit: `UX-REPORT.md`, this README and the 20 curated PNGs under `screenshots/`.
- Do not commit: `test-results/` or `playwright-report/`. They are ignored and contain detailed JSON findings, HTML results, per-test screenshots and failure traces.
- The `FareEnough UX review` Actions workflow runs on relevant pull-request changes. Its artifact contains the current generated package, detailed results, test evidence and HTML report, including failed runs. Retention is seven days; the committed curated package persists with the PR. Download artifacts from the workflow run's **Artifacts** section.
- CI checks out the PR head with read-only permissions and no persisted Git credentials or deployment secrets. It never pushes, posts comments, merges, promotes or deploys. Review and commit regenerated files deliberately when the UI changes.
- Browser tooling and Chromium downloads are development/CI dependencies. Browser binaries, traces and HTML reports never enter the repository.

## Source identity and updating scenarios

The generated report records the UI's last source-changing commit, generation checkout commit and a SHA-256 covering preview/runtime/global-style/avatar source files. The generated package cannot contain its own commit hash; its Git history identifies the later package commit. A timestamp and UI dirty-state flag prevent a screenshot package from silently claiming to be evidence for a newer checkout.

Dates use the server's current Hong Kong demo date, which is captured in the report. There are no pixel-equality baselines: dates, OS/CJK fonts and browser updates can change rendering. Images are viewport captures at 390×1100 and 1440×1000, with interiors scrolled to relevant content. Motion is disabled; UI content is not replaced or hidden.

When labels, fields, sample routes or navigation change, update `tests/ux-review/fareenough.spec.mjs` and the screen captions/product inventory in `scripts/ux-review/settings.mjs` and `reporter.mjs`. Do not make failing assertions optional to produce screenshots. Keep captures small and synthetic, and inspect the generated report and images before committing them.

## Data boundary

Every run uses new Playwright browser contexts without user profiles, storage state or cookies. Requests are allowed only to the exact loopback test origin, `/v2-preview`, local Next static assets and local animal avatars. The image optimizer is restricted to those avatar paths. API, auth, production/customer routes, remote assets and non-GET/HEAD requests are blocked and fail the run. No passwords, personal messages, authenticated accounts or customer records are captured. Never adapt this command to an authenticated/live environment without a separate review of its data boundary.

## Give this package to another AI reviewer

> Read `docs/ux-review/UX-REPORT.md` and inspect its linked screenshots on the PR branch. Confirm the recorded source commit/hash and report timestamp before reviewing newer code. Separate reproducible functional failures, automated accessibility findings, heuristic advisories and design opinions. Cite the screenshot filename and affected flow for each issue; state severity, user impact, evidence and a focused improvement. Do not infer live booking/chat/payment/flight tracking from this in-memory demo. If evidence is missing, run `npm run ux:review` locally instead of requesting manual screenshots. Preserve the palette, Cantonese content and mobile masonry unless explicitly asked to redesign. Do not modify production data, log into real accounts, merge or deploy.

References: [Playwright web server](https://playwright.dev/docs/test-webserver), [screenshots](https://playwright.dev/docs/screenshots), [reporters](https://playwright.dev/docs/test-reporters), [accessibility testing](https://playwright.dev/docs/accessibility-testing), [CI setup](https://playwright.dev/docs/ci).
