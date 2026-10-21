import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, copyFile, writeFile, stat, readdir, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { repoRoot, resultsDir, reviewDir, screens, maxScreenshotBytes } from "./settings.mjs";

const sourcePaths = ["src/app/v2-preview", "src/app/layout.tsx", "src/app/globals.css", "src/components/route-runtime.tsx", "public/avatars/animals"];
const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
const cell = (text) => String(text).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();

export default class UXReporter {
  constructor() { this.tests = []; this.steps = []; this.evidence = []; }

  onBegin() {
    const files = git("ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...sourcePaths).split("\0").filter(Boolean).sort();
    const hash = createHash("sha256");
    for (const file of files) hash.update(file).update("\0").update(readFileSync(join(repoRoot, file)));
    const page = readFileSync(join(repoRoot, "src/app/v2-preview/page.tsx"), "utf8");
    this.meta = {
      generated: new Date().toISOString(), branch: git("branch", "--show-current") || "detached checkout",
      checkout: git("rev-parse", "HEAD"), uiCommit: git("log", "-1", "--format=%H", "--", ...sourcePaths),
      uiHash: hash.digest("hex"), uiDirty: Boolean(git("status", "--porcelain", "--", ...sourcePaths)),
      version: page.match(/\|\s*(V[\d.]+)\s+Preview/)?.[1] || "unidentified preview version",
      node: process.version, platform: process.platform,
      playwright: JSON.parse(readFileSync(join(repoRoot, "node_modules/@playwright/test/package.json"), "utf8")).version,
    };
  }

  onStepEnd(test, result, step) {
    if (step.category === "test.step") this.steps.push({ project: test.parent.project().name, title: step.title, status: step.error ? "failed" : "passed" });
  }

  onTestEnd(test, result) {
    const project = test.parent.project().name;
    this.tests.push({ project, title: test.title, status: result.status, duration: result.duration, errors: result.errors.map((e) => e.message || "Unknown test error") });
    for (const attachment of result.attachments) {
      if (attachment.name === "ux-evidence" && attachment.body)
        this.evidence.push({ project, ...JSON.parse(attachment.body.toString()) });
    }
  }

  async onEnd(result) {
    if (!this.meta) return;
    const captures = this.evidence.flatMap((e) => e.captures.map((c) => ({ project: e.project, ...c })));
    const expected = ["mobile", "desktop"].flatMap((p) => screens.map(([id]) => `${p}-${id}.png`));
    const complete = expected.every((name) => captures.some((c) => c.filename === name));
    const artifactDir = join(resultsDir, "package");
    await mkdir(join(artifactDir, "screenshots"), { recursive: true });
    let bytes = 0;
    for (const c of captures) {
      bytes += (await stat(c.path)).size;
      await copyFile(c.path, join(artifactDir, "screenshots", c.filename));
    }
    const withinBudget = bytes <= maxScreenshotBytes;
    const passed = result.status === "passed" && complete && withinBudget;
    const status = passed ? "PASS — complete package" : result.status === "passed" && !complete ? "PARTIAL — package not published" : "FAIL — package not published";
    const report = this.report({ captures, bytes, status, duration: result.duration, complete, withinBudget });
    await writeFile(join(artifactDir, "UX-REPORT.md"), report);
    await copyFile(join(reviewDir, "README.md"), join(artifactDir, "README.md"));
    await copyFile(join(reviewDir, "USABILITY-TEST.md"), join(artifactDir, "USABILITY-TEST.md"));
    await writeFile(join(resultsDir, "results.json"), JSON.stringify({ metadata: this.meta, status, complete, withinBudget, bytes, tests: this.tests, steps: this.steps, evidence: this.evidence }, null, 2));
    if (passed) {
      const screenshotDir = resolve(reviewDir, "screenshots");
      if (!screenshotDir.startsWith(resolve(reviewDir) + sep)) throw new Error("Invalid screenshot output directory");
      await mkdir(screenshotDir, { recursive: true });
      // Only generator-owned image files are replaced; never recursively remove a directory.
      for (const file of await readdir(screenshotDir)) {
        if (/^(mobile|desktop)-\d{2}-[a-z0-9-]+\.png$/.test(file) && !expected.includes(file))
          await rm(join(screenshotDir, file));
      }
      for (const c of captures) await copyFile(c.path, join(screenshotDir, c.filename));
      await writeFile(join(reviewDir, "UX-REPORT.md"), report);
      console.log(`\nUX review: ${captures.length} screenshots, ${(bytes / 1024).toFixed(0)} KiB. Published docs/ux-review/UX-REPORT.md`);
    } else {
      console.log(`\nUX review ${status}: ${captures.length}/20 images, ${(bytes / 1024).toFixed(0)} KiB / ${maxScreenshotBytes / 1024} KiB limit. Kept the previous curated package. Inspect test-results/ux-review/package/UX-REPORT.md and the HTML report.`);
    }
    if (!withinBudget || (result.status === "passed" && complete && !passed)) return { status: "failed" };
  }

  report({ captures, bytes, status, duration, complete, withinBudget }) {
    const m = this.meta;
    const audits = new Map();
    const scans = [...captures, ...this.evidence.flatMap((e) => e.observations
      .filter((o) => Array.isArray(o.violations)).map((o) => ({ project: e.project, id: o.kind, ...o })))];
    const incomplete = [...new Set(scans.flatMap((scan) => scan.incompleteRules || []))];
    for (const capture of scans) for (const violation of capture.violations) {
      if (!audits.has(violation.id)) audits.set(violation.id, { ...violation, nodes: 0, states: new Set(), example: violation.nodes[0] });
      const row = audits.get(violation.id);
      row.nodes += violation.nodes.length;
      row.states.add(`${capture.project}/${capture.id}`);
    }
    const auditRows = [...audits.values()].sort((a, b) => b.states.size - a.states.size).map((v) =>
      `| [${cell(v.id)}](${v.helpUrl}) | ${v.impact} | ${v.states.size} | ${v.nodes} | ${cell(v.example?.target?.join(" ") || "")} |`
    ).join("\n");
    const small = this.evidence.flatMap((e) => e.captures.flatMap((c) => c.layout.smallTargets.map((t) => ({ project: e.project, ...t }))));
    const sampleTargets = [...new Map(small.map((t) => [`${t.project}/${t.label}`, t])).values()].slice(0, 4);
    const focusIssues = this.evidence.filter((e) => e.observations.some((o) => o.kind === "focus-return" && !o.passed));
    const boundaryStops = this.evidence.filter((e) => e.observations.some((o) => o.kind === "dialog-keyboard" && o.stops.some((s) => !s.inside)));
    const gallery = screens.map(([id, title, description]) => {
      const img = (p) => captures.some((c) => c.project === p && c.id === id)
        ? `[![${title} — ${p}](screenshots/${p}-${id}.png)](screenshots/${p}-${id}.png)` : "Not captured";
      return `| **${title}**<br>${description} | ${img("mobile")} | ${img("desktop")} |`;
    }).join("\n");
    const steps = [...new Set(this.steps.map((s) => s.title))].map((title) => `| ${cell(title)} | ${["mobile", "desktop"].map((p) => this.steps.find((s) => s.project === p && s.title === title)?.status || "not run").join(" | ")} |`).join("\n");
    const errors = this.evidence.reduce((n, e) => n + e.consoleErrors.length, 0);
    const requests = this.evidence.reduce((n, e) => n + e.blockedRequests.length, 0);
    return `# FareEnough ${m.version} — automated UX review

Generated: ${m.generated} (UTC). **${status}**. This is captured evidence and a product inventory, not an accessibility certification or a pixel-diff baseline.

## Version and reproducibility

- Reviewed UI source commit: [\`${m.uiCommit}\`](https://github.com/tonylo0929/ridepod/commit/${m.uiCommit}).
- Generation checkout: \`${m.checkout}\`; branch: \`${m.branch}\`.
- UI source files modified/untracked at capture: **${m.uiDirty ? "yes — source hash below identifies the working copy" : "no"}**.
- SHA-256 of preview/runtime/global styles/avatar source files: \`${m.uiHash}\`.
- Toolchain: Node ${m.node}, Playwright ${m.playwright}, Chromium ${this.evidence[0]?.browser || "not started"}, ${m.platform}.
- Viewports: mobile **390 × 1100**, desktop **1440 × 1000**, device scale 1, zh-HK locale, Asia/Hong_Kong timezone, reduced motion. PNG viewport captures; modal interiors are scrolled where noted. No content is hidden for screenshots.
- Server demo date anchor(s): ${[...new Set(this.evidence.map((e) => e.demoDate).filter(Boolean))].join(", ") || "not obtained"}. “今日/聽日” roll forward on future runs. Each run starts a fresh local production build and new isolated contexts; no saved sessions are loaded.
- The package commit necessarily follows the reviewed checkout because generated files cannot contain their own Git hash. The UI source commit/hash above identify what is pictured. CI artifacts record the actual tested checkout.

## Screens and navigation

The product is a passenger-led, Cantonese journey-discovery demo under \`/v2-preview\`. FareEnough uses mint, cream and warm yellow, route illustrations and animal avatars. Phones use two masonry lanes; desktop uses four.

| Screen | Reach it | Available actions |
| --- | --- | --- |
| Home / airport feed | Default category; 首頁 returns to top | Search text, today/tomorrow, direction, flight filter, sorting; open cards or express interest |
| Airport filters | 篩選 | Common date/district/planned places/direction; optional 更多條件 for earliest car departure, luggage, waiting and flight |
| Popular routes | 熱門路線 tab | Corridors, morning/evening, recurring journeys and shared search/sorting |
| Journey details | Card; sample query \`?journey=demo-1\` | Route, author, planned group size, interest, meeting/luggage/waiting and independent airport times |
| Create Post — step 1 | 發佈, 分享行程 or 分享下一程 | Essential trip fields; optional flight/exit/luggage/wait/meeting/message disclosure |
| Create Post — step 2 | 幫我寫個帖文 | Compact route/car departure summary, editable title/body, optional full flight timeline/number and cover, normal-flow publish action |
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

Run duration: ${(duration / 1000).toFixed(1)} seconds. ${captures.length}/20 curated images; ${(bytes / 1024).toFixed(0)} KiB total; ${maxScreenshotBytes / 1024 / 1024} MiB budget **${withinBudget ? "passed" : "exceeded"}**; capture completeness **${complete ? "passed" : "failed"}**.

| Test | Status | Duration |
| --- | --- | --- |
${this.tests.map((t) => `| ${t.project}: ${cell(t.title)} | ${t.status} | ${(t.duration / 1000).toFixed(1)}s |`).join("\n")}

The logic test executes the nine airport/count/copy assertions in \`scripts/test-v2-airport-timing.mjs\`, plus allow/deny cases for the capture network boundary. Playwright's web server runs \`npm run build\` (including Next's TypeScript check) before browser tests; a failed build prevents capture. This report does not imply that every production flow or repository test was run.

Both flight inputs are checked with an invalid character and a valid synthetic flight number. The initial review exposed an unescaped hyphen in their HTML pattern under Unicode-aware browsers; the focused V2 fix is included in the reviewed UI source commit. The suite requires zero browser errors and verifies that the pattern rejects invalid input. See the [HTML pattern standard](https://html.spec.whatwg.org/multipage/input.html#the-pattern-attribute).

| Browser flow/assertions | Mobile | Desktop |
| --- | --- | --- |
${steps || "| No browser steps completed | not run | not run |"}

No horizontal page overflow is required at every capture point. Browser errors observed: **${errors}**. Forbidden network attempts observed: **${requests}**. A forbidden attempt fails the run before publication.

## Accessibility and usability findings

Automated axe scans run at every captured state and the expanded filter/cover states against WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tags (${scans.length} scans). **Contrast and visible-label/name mismatches are mandatory regression gates**; all other findings are also reported. Duplicate occurrences across states are counted, not unique UI defects. No audit rules are disabled or excluded. Incomplete rules requiring human review: **${incomplete.join(", ") || "none reported"}**; element-level findings are retained in the JSON artifact. Zero automatic violations does not establish full WCAG conformance.

| Automated rule | Impact | Affected audited states | Node occurrences across states | Example selector |
| --- | --- | --- | --- | --- |
${auditRows || "| No automatic violations detected in completed scans | — | 0 | 0 | — |"}

${[...audits.values()].slice(0, 4).map((v) => `- **${cell(v.help)}:** ${cell(v.example?.failureSummary || "Inspect the detailed audit artifact.")}`).join("\n")}

- **Touch-size advisory:** ${sampleTargets.length ? sampleTargets.map((t) => `${t.project} “${cell(t.label)}” ${t.width}×${t.height}px`).join("; ") : "No sampled visible controls below 44×44px."} These are a small visibility-based sample, not a WCAG target-size conformance result; spacing exceptions and overlap need human assessment. Prefer larger touch areas where practical.
- **Keyboard:** Tab/Shift+Tab explicitly cycle between the first/last eligible dialog controls; the regression fails on a body/background stop. Escape is exercised. ${boundaryStops.length ? `Unexpected boundary stops recorded on ${boundaryStops.map((e) => e.project).join(", ")}.` : "Both tested boundary directions remained in the dialog."} ${focusIssues.length ? `Opener focus restoration failed on ${focusIssues.map((e) => e.project).join(", ")}.` : "Escape restored the arrival-card opener at both widths."} Create step changes focus their heading and return to the top. A screen-reader session and every modal/assistive-technology path remain untested.
- **Masonry reading order:** cards use a flat DOM and a sparse row-flow grid with measured heights, preserving two/three/four columns. Tests compare every source-ordered card's top/left position, check same-column separation and Tab progression to the next visual card. The previous whole-column DOM order was replaced. Human screen-reader comprehension still requires evaluation.
- **Mobile usability:** duplicate post copy moved to details; route, departure, optional flight and independent interest/capacity stay in cards. Common filters remain visible and advanced options are disclosed. Main filter/input/icon targets are at least 44px. Step 2 uses a compact cover/route summary, editable copy and optional timing/cover disclosures; its publish control is in document flow. Detail screenshots show scrolled interiors. Verify disclosure comprehension and action discoverability with people and enlarged text.

## Known limitations and review guidance

- This workflow uses Chromium at two widths, not every browser/device. No pixel equality assertions: OS/CJK fonts, browser updates, current demo dates and rendering can alter images. CI installs CJK fonts; Windows and Linux may render differently.
- Source-driven labels and synthetic fixture routes are intentional test contracts. If the product's screens or accessible names change, update the scenarios and this product inventory rather than weakening assertions.
- Captures are viewport images, not exhaustive full-page composites. Use the report's flow descriptions, the local UI and test traces to inspect content beyond the fold.
- Automated checks cannot establish overall usability or accessibility. Incomplete axe checks, screen-reader comprehension, browser/OS control behavior, zoom and every focus path need human review. Other audit-rule findings, if listed above, are unresolved even when the P0 gates pass.
- The [five-person usability-test package](USABILITY-TEST.md) is prepared but sessions have not been conducted. Recruit five real participants, record actual observations and resolve critical findings before adding more features; no AI or synthetic participant results are claimed.
- Demo state disappears on refresh, including interests and created/edited posts; local links then expire. No live customer or production integration is tested. Preview deployment may require authorised Vercel sign-in; this package is generated locally and does not depend on that login.
- The last complete passing package is retained if a later run fails or is partial. Check this report's timestamp/commit against the PR and inspect the latest Actions artifact before assuming it describes newer code. The workflow uploads current failure evidence and never commits generated changes automatically.

## Regenerate and inspect

See [README](README.md) for setup, safety boundary, CI artifacts and how another AI should review this package. Run \`npm run ux:review\` after installing dependencies and Chromium. Extensive results, per-element audits, HTML output and failure traces remain in ignored directories and short-lived Actions artifacts.

## Screenshot gallery

Click an image for its native resolution. The 20-image limit covers ten states at both widths; only these PNGs and this report are intended for source control.

| State / context | Mobile · 390px | Desktop · 1440px |
| --- | --- | --- |
${gallery}
`;
  }
}
