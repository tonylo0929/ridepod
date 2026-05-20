# RidePod Demo Data Reset

This guide describes the safe dev/local/test path for resetting RidePod demo data to the E2E seed scenarios.

## Never Run This Against Production

Never run this against production.

The reset flow is for local, dev, staging, or test Supabase projects only. It is not a production repair tool and must not be used against live user data.

## What The Reset Uses

RidePod demo data is defined in:

- `supabase/seed.sql`
- `supabase/tests/ridepod_e2e_seed_checks.sql`

The seed is written with deterministic IDs and upserts where possible so it can be re-applied for local/dev testing. Prefer this existing seed rather than writing custom destructive SQL.

## Scripted Local/Test Reset

Use the guarded helper:

```powershell
$env:RIDEPOD_ALLOW_DEMO_RESET="true"
$env:NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
node scripts/reset-ridepod-demo-data.mjs
```

Safety behavior:

- Requires `RIDEPOD_ALLOW_DEMO_RESET=true`.
- Requires `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`.
- Prints only the Supabase URL host, not keys.
- Refuses targets that do not look local/test/dev/staging.
- Requires `supabase/seed.sql`.
- Requires `supabase/tests/ridepod_e2e_seed_checks.sql`.
- Delegates to `supabase db reset` if Supabase CLI is available.
- Does not print anon, service, or database keys.
- Does not run automatically.

## Manual SQL Editor Fallback

If Supabase CLI is unavailable:

1. Open the Supabase SQL Editor for a local/test project.
2. Run `supabase/seed.sql`.
3. Run `supabase/tests/ridepod_e2e_seed_checks.sql`.
4. Verify the expected scenario rows appear.
5. Do not run these steps against production.

## Demo Scenarios Included

The seed/check flow is intended to cover:

- Scheduled ride app quote needed.
- Scheduled ride app ready to book.
- Scheduled ride app receipt needed.
- Scheduled taxi meter proof needed.
- Recurring back-and-forth.
- Settlement ready.
- Dispute review.
- Admin review queue.
- Profile eligibility.
- Safety report.

## Verification After Reset

After reset, run the sanity SQL checks:

```text
supabase/tests/ridepod_e2e_seed_checks.sql
```

Then run app checks:

```powershell
npm.cmd run test:money-safety
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

## Production Rules

- Do not truncate production data.
- Do not run `supabase db reset` against a production project.
- Do not expose service role keys in client code.
- Do not print secret values in terminal output or docs.
- Do not add automatic demo reset behavior to app startup.
