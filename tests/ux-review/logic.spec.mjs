import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { allowedRequest, baseURL, repoRoot } from "../../scripts/ux-review/settings.mjs";

test("departure validation uses an injectable Hong Kong clock", async ({}, testInfo) => {
  const output = execFileSync(process.execPath, ["--experimental-strip-types", "scripts/test-v2-departure-time.mjs"], { cwd: repoRoot, encoding: "utf8" });
  expect(output).toMatch(/pass 5/);
  await testInfo.attach("fixed-clock-departure-checks", { body: output, contentType: "text/plain" });
});

test("airport/count logic and capture network isolation", async ({}, testInfo) => {
  const output = execFileSync(process.execPath, ["--experimental-strip-types", "scripts/test-v2-airport-timing.mjs"], { cwd: repoRoot, encoding: "utf8" });
  expect(output).toMatch(/pass 9/);
  await testInfo.attach("nine-logic-checks", { body: output, contentType: "text/plain" });
  expect(allowedRequest(`${baseURL}/v2-preview?journey=demo-1`)).toBe(true);
  expect(allowedRequest(`${baseURL}/_next/image?url=%2Favatars%2Fanimals%2Fcat.png&w=48&q=75`)).toBe(true);
  for (const unsafe of [
    "https://ridepod.vercel.app/v2-preview",
    `${baseURL}/api/pod-membership`,
    `${baseURL}/auth/callback`,
    `${baseURL}/home`,
    `${baseURL}/_next/image?url=https://customer.invalid/private.png`,
    `${baseURL}/_next/image?url=%2Fapi%2Fprivate`,
  ]) expect(allowedRequest(unsafe)).toBe(false);
  expect(allowedRequest(`${baseURL}/v2-preview`, "POST")).toBe(false);
});
