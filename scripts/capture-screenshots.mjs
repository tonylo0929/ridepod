import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const baseUrl = process.env.RIDEPOD_URL ?? "http://localhost:3000";
const outputDir = "screenshots";
const variants = ["fintech", "community", "travel", "premium", "campus"];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

mkdirSync(outputDir, { recursive: true });

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

console.log(`Capturing RidePod design screenshots from ${baseUrl}`);
console.log("Make sure the dev server is running with: npm run dev");

for (const variant of variants) {
  const url = `${baseUrl}/designs/${variant}`;
  const output = `${outputDir}/ridepod-${variant}-mobile.png`;
  try {
    run(npx, [
      "--yes",
      "playwright",
      "screenshot",
      "--viewport-size=390,844",
      "--full-page",
      url,
      output,
    ]);
  } catch {
    console.error("\nScreenshot capture failed.");
    console.error("If Playwright reports a missing browser, run: npx playwright install chromium");
    console.error("Then run: npm run screenshots");
    process.exit(1);
  }
}

console.log(`Saved ${variants.length} screenshots in ${outputDir}/`);
