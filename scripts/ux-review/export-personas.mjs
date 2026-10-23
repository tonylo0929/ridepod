import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { repoRoot, reviewDir } from "./settings.mjs";

const results = join(repoRoot, "test-results", "persona-review");
const summary = JSON.parse(await readFile(join(results, "playwright-results.json"), "utf8"));
if (summary.stats.expected !== 7 || summary.stats.unexpected || summary.stats.skipped || summary.stats.flaky)
  throw new Error("Export requires all seven persona executions to complete without harness failures.");

const curated = new Set([
  "01-interested-journey-found", "02-family-count-and-luggage",
  "03-same-day-past-departure", "04-recurring-single-date-form",
  "05-message-shortlist-not-chat", "06-320-baseline", "06-320-text-200",
  "06-320-author-overlap", "06-390-text-200",
]);
const screenshotsDir = join(reviewDir, "persona-screenshots");
await mkdir(screenshotsDir, { recursive: true });
const sessions = [];
let bytes = 0, images = 0;
for (const entry of await readdir(results, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(results, entry.name);
  const record = JSON.parse(await readFile(join(dir, "observations.json"), "utf8"));
  if (record.execution !== "passed" || record.blocked.length || record.browserErrors.length)
    throw new Error(`Incomplete or unsafe execution: ${record.scenario}`);
  record.trace = `test-results/persona-review/${entry.name}/trace.zip`;
  for (const shot of record.screenshots) {
    const file = join(dir, `${shot.name}.png`);
    shot.path = relative(repoRoot, file).replaceAll("\\", "/");
    if (!curated.has(shot.name)) continue;
    bytes += (await stat(file)).size;
    if (bytes > 1536 * 1024) throw new Error("Curated persona screenshots exceed the 1.5 MiB budget.");
    await copyFile(file, join(screenshotsDir, `${shot.name}.png`));
    shot.curated = `persona-screenshots/${shot.name}.png`;
    images++;
  }
  sessions.push(record);
}
if (sessions.length !== 7 || images !== curated.size) throw new Error("Missing scenario or curated screenshot.");
sessions.sort((a, b) => a.scenario.localeCompare(b.scenario));
const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", windowsHide: true }).trim();
const sourcePaths = ["src/app/v2-preview", "src/app/layout.tsx", "src/app/globals.css", "src/components/route-runtime.tsx", "public/avatars/animals"];
const files = git("ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...sourcePaths).split("\0").filter(Boolean).sort();
const hash = createHash("sha256");
for (const file of files) { hash.update(file); hash.update("\0"); hash.update(await readFile(join(repoRoot, file))); }
const checks = sessions.flatMap((session) => session.checks);
const evidence = {
  generated: new Date().toISOString(), checkout: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"), uiCommit: git("log", "-1", "--format=%H", "--", ...sourcePaths),
  uiHash: hash.digest("hex"), uiDirty: Boolean(git("status", "--porcelain", "--", ...sourcePaths)),
  node: process.version, platform: process.platform,
  methodology: "Six AI-driven personas, seven fresh-context rendered-browser scenarios. Diagnostic task FAIL results are findings, not harness failures. Automation durations are not human task times. No real participants. Computed-font enlargement is not native browser zoom.",
  executions: sessions.length, harness: summary.stats, screenshotCount: images, screenshotBytes: bytes,
  taskResults: Object.fromEntries(["PASS", "FAIL", "WORKAROUND", "NOT_TESTED"].map((status) => [status, checks.filter((c) => c.outcome === status).length])),
  sessions,
};
await writeFile(join(reviewDir, "PERSONA-EVIDENCE.json"), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify({ executions: sessions.length, taskResults: evidence.taskResults, curatedImages: images, screenshotKiB: Math.round(bytes / 1024), uiDirty: evidence.uiDirty, uiHash: evidence.uiHash }));
