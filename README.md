# Fintech Internal Tools Platform

Monorepo of internal operational tools. Each application lives under `apps/` and
is self-contained (own `package.json`, Prisma schema, Dockerfile, and tests).

All apps follow the **Internal Tooling Architectural Standards**:

- Next.js (App Router) + TypeScript + Tailwind CSS + Lucide icons
- SQLite via Prisma — no external cloud dependencies for local/dev
- Universal `AuditLog` table (`resourceType`, `resourceId`, `actorEmail`,
  `actorRole`, `previousState`, `newState`, `reason`, `timestamp`)
- Every state mutation writes its audit entry inside the same Prisma
  `$transaction`
- High-risk mutations (rejections, overrides) require a non-empty reason
- Global RBAC top-bar switcher: **Standard User** (Tier 1, maker) and
  **Admin User** (Tier 2, checker)
- Multi-stage Node 20 Alpine Dockerfile + `docker-compose.yml` per app;
  CI (lint, test, build) via `.github/workflows/ci.yml`

## Apps

| App             | Path             | Description                                          |
| --------------- | ---------------- | ---------------------------------------------------- |
| KYC Review Queue| `apps/kyc-queue` | Compliance queue for reviewing KYC applications      |

See each app's `README.md` for local setup.
