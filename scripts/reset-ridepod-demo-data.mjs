import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const REQUIRED_FLAG = "RIDEPOD_ALLOW_DEMO_RESET";
const seedPath = "supabase/seed.sql";
const sanityChecksPath = "supabase/tests/ridepod_e2e_seed_checks.sql";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getSafeTargetHost(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname;
  } catch {
    return "";
  }
}

function isSafeDemoHost(hostname) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.includes("local") ||
    normalized.includes("test") ||
    normalized.includes("dev") ||
    normalized.includes("staging")
  );
}

function getSupabaseCommand() {
  return process.platform === "win32" ? "supabase.cmd" : "supabase";
}

function assertSupabaseCliAvailable() {
  const command = getSupabaseCommand();
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });

  if (result.error || result.status !== 0) {
    fail(
      [
        "Supabase CLI is not available.",
        "Manual fallback:",
        "1. Open the Supabase SQL Editor for a local/test project.",
        `2. Run ${seedPath}.`,
        `3. Run ${sanityChecksPath}.`,
        "4. Verify the demo scenarios before testing.",
      ].join("\n"),
    );
  }

  return command;
}

if (process.env[REQUIRED_FLAG] !== "true") {
  fail(`Refusing to reset demo data. Set ${REQUIRED_FLAG}=true for local/test demo resets.`);
}

const supabaseUrl = getSupabaseUrl();
if (!supabaseUrl) {
  fail("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL. Refusing to reset demo data.");
}

const targetHost = getSafeTargetHost(supabaseUrl);
if (!targetHost || !isSafeDemoHost(targetHost)) {
  fail(
    [
      "Refusing to reset demo data because the Supabase target does not look local/test.",
      `Target host: ${targetHost || "unknown"}`,
      "Never run this against production.",
    ].join("\n"),
  );
}

if (!existsSync(seedPath)) {
  fail(`Missing ${seedPath}.`);
}

if (!existsSync(sanityChecksPath)) {
  fail(`Missing ${sanityChecksPath}.`);
}

const supabaseCommand = assertSupabaseCliAvailable();

console.warn("RidePod demo data reset requested.");
console.warn("Never run this against production.");
console.warn(`Target Supabase host: ${targetHost}`);
console.warn("This will run the local Supabase reset flow and re-apply seed data.");

const resetResult = spawnSync(supabaseCommand, ["db", "reset"], {
  stdio: "inherit",
  env: process.env,
});

if (resetResult.error || resetResult.status !== 0) {
  fail("Supabase demo reset failed. Check the Supabase CLI output above.");
}

console.log("RidePod demo data reset complete.");
console.log(`Run ${sanityChecksPath} against the same local/test database to verify scenarios.`);
