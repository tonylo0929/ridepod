import { defineConfig } from "@playwright/test";
import { baseURL } from "./scripts/ux-review/settings.mjs";

export default defineConfig({
  testDir: "./tests/ux-review",
  outputDir: "test-results/ux-review",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 180_000,
  globalTimeout: 600_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/ux-review", open: "never" }],
    ["./scripts/ux-review/reporter.mjs"],
  ],
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    locale: "zh-HK",
    timezoneId: "Asia/Hong_Kong",
    colorScheme: "light",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "logic", testMatch: /logic\.spec\.mjs/ },
    { name: "mobile", testMatch: /fareenough\.spec\.mjs/, dependencies: ["logic"], use: { viewport: { width: 390, height: 1100 }, isMobile: true, hasTouch: true } },
    { name: "desktop", testMatch: /fareenough\.spec\.mjs/, dependencies: ["logic"], use: { viewport: { width: 1440, height: 1000 } } },
    { name: "repairs", testMatch: /repairs\.spec\.mjs/, dependencies: ["logic"], use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    // Always start a fresh local production build; never reuse an existing login/session server.
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${new URL(baseURL).port}`,
    url: `${baseURL}/v2-preview`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
    stdout: "ignore",
    stderr: "pipe",
  },
});
