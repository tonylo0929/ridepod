import { defineConfig } from "@playwright/test";
import review from "./playwright.ux.config.mjs";

export default defineConfig({
  ...review,
  testMatch: /personas\.spec\.mjs/,
  outputDir: "test-results/persona-review",
  projects: [{ name: "personas" }],
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/persona-review", open: "never" }],
    ["json", { outputFile: "test-results/persona-review/playwright-results.json" }],
  ],
  use: {
    ...review.use,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: "on",
  },
});
