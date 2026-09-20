---
name: testing-kyc-queue
description: How to run and smoke-test the apps/kyc-queue internal tool (dev server, seeded SQLite DB, role switcher, transition API) in the fintech-internal-tools-platform pnpm+turbo monorepo.
---

# Testing the KYC Queue app

## Dev server
- `cd <repo> && pnpm install` once, then `pnpm --filter kyc-queue dev` starts Next.js on http://localhost:3000.
- `DATABASE_URL="file:./dev.db"` resolves relative to `packages/db/prisma/` — it is already set in the app's env; pass it explicitly only for the standalone server.
- Seeded DB: `packages/db/prisma/dev.db` (17 applications: 8 PENDING, 4 FLAGGED, 3 APPROVED, 2 REJECTED at seed time). Inspect with `sqlite3 packages/db/prisma/dev.db "..."` — columns are camelCase (actorEmail, previousState, ...).

## UI facts
- `/queue` table: click an applicant **name** to open the `ApplicationDetailModal` (fetches `/api/applications/:id`). There is also a `/queue/<id>` page.
- The status `<select>` sits to the **right** of the search box in the toolbar — easy to click the search input by mistake; zoom to get coordinates.
- RoleSwitcher (header, right side) writes a `kyc-role` cookie (`standard`/`admin`) and calls `router.refresh()`. "Acting as" pill shows the active role.
- Pagination only renders when filtered rows > 20 (17 seeded rows → no pagination is correct, not a bug).

## RBAC matrix (packages/rbac/src/index.ts)
- PENDING: standard approve/reject/flag; admin approve/reject.
- FLAGGED: standard = locked out (disabled buttons + "Requires Admin Review" badge); admin = approve/reject, reason REQUIRED.
- Terminal (APPROVED/REJECTED): admin may flip to the opposite terminal state, reason required.
- reject/flag always need a reason. Server returns 400 for empty/whitespace reason, 403 for disallowed role.

## Verifying mutations server-side without a browser session
The transition API only checks the `kyc-role` cookie — a plain curl works:
```
curl -X POST http://localhost:3000/api/applications/<id>/transition \
  -H 'Content-Type: application/json' -H 'Cookie: kyc-role=admin' \
  -d '{"action":"approve","reason":"..."}'
```
Useful for asserting 400/403 enforcement paths the UI client-side-guards.
