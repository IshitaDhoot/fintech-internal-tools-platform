---
name: testing-feature-flag-admin
description: How to run and smoke-test the apps/feature-flag-admin internal tool (dev server, seeded SQLite DB, role switcher, mutate/propose APIs) in the fintech-internal-tools-platform pnpm+turbo monorepo.
---

# Testing the Feature Flag Admin app

## Dev server
- `DATABASE_URL="file:./dev.db" pnpm --filter feature-flag-admin dev` serves Next.js on http://localhost:3001; "/" redirects to "/flags".
- Seeded DB: `packages/db/prisma/dev.db` (17 FeatureFlag rows; seed via `pnpm db:seed:flags`). Inspect with `sqlite3 packages/db/prisma/dev.db "SELECT id, key, environment, state, rolloutPercentage FROM FeatureFlag;"` — columns are camelCase.
- Useful seeded prod flags: `kyc.auto_approve_low_risk`, `transfers.instant_ach` (both prod/disabled), `fx.realtime_quotes` (prod/archived). NB: seed state may drift if a prior test session mutated flags — check the DB first. Reseeding regenerates ALL row IDs (cuid), so never hardcode flag IDs across runs — look them up by `key` each time. `pnpm db:seed:flags` needs `DATABASE_URL="file:./dev.db"` in the env.
- UI quirk: clicks inside `FlagDetailModal` occasionally don't land (observed once; reopening the modal or using the deep-linkable `/flags/<id>` page — same FlagDetail/FlagActions — is a reliable fallback).

## UI facts
- `/flags` table: click a flag **key** to open `FlagDetailModal` (fetches `/api/flags/:id` which returns `{flag, auditLogs, role, actions}`). Deep-linkable `/flags/<id>` page also exists.
- Toolbar: search box, then "All environments" select, then "All states" select; "Export to CSV" at the right writes `feature-flags-YYYY-MM-DD.csv` to ~/Downloads via blob download.
- Rollout column renders a `RolloutMeter` progress bar; column headers are clickable to sort.
- RoleSwitcher (header, right side) writes a `flags-role` cookie (`standard`/`admin`); buttons labeled "Standard User" / "Admin User".

## RBAC matrix (packages/rbac/src/flags.ts)
- dev/staging: standard+admin may toggle / set_rollout, no reason required.
- prod: admin only for toggle/set_rollout — reason REQUIRED (empty → 400). Standard is locked out: disabled buttons + purple "Requires Admin" badge, but gets purple "Propose enable/Propose rollout" controls that POST `/propose` (writes an AuditLog `proposed:<state>@<pct>%` row only; the flag is never mutated).
- archive: admin only, reason required in ANY env. There is no delete — archived is fully terminal ("No actions available").
- Audit rows render `state@rollout%` snapshots, e.g. `disabled@0% → enabled@40%`.

## Verifying mutations server-side without a browser session
The mutate/propose APIs only check the `flags-role` cookie — plain curl works:
```
curl -i -X POST http://localhost:3001/api/flags/<id>/mutate \
  -H 'Content-Type: application/json' -H 'Cookie: flags-role=admin' \
  -d '{"action":"toggle","reason":"..."}'
```
Omit `reason` on a prod flag to assert the 400 "A reason is required for every prod mutation" path the UI client-side-guards.
