# Fintech Internal Tools Platform

pnpm workspace + Turborepo monorepo of internal operational tools.
Applications live under `apps/`; shared, reusable code lives under `packages/`.

## Layout

| Path                          | Contents                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| `apps/kyc-queue`              | KYC Review Queue — compliance queue for reviewing applications  |
| `apps/feature-flag-admin`     | Feature Flag Admin — flag state/rollout management with prod guardrails |
| `packages/db`                 | Prisma client + shared schema (incl. the universal `AuditLog`)  |
| `packages/audit`              | `withAudit()` atomic mutation+audit helper, reason validation   |
| `packages/rbac`               | `Role` enum, `useRole()`, `<Can/>` guard, server permission checks, per-app matrices |
| `packages/ui`                 | `DataTable`, `Modal`, `StatusBadge`, `RoleSwitcher`             |
| `packages/config`             | Shared eslint / tsconfig / tailwind presets                     |

All apps follow the **Internal Tooling Architectural Standards**:

- Next.js (App Router) + TypeScript + Tailwind CSS + Lucide icons
- SQLite via Prisma — no external cloud dependencies for local/dev
- Universal `AuditLog` table (`resourceType`, `resourceId`, `actorEmail`,
  `actorRole`, `previousState`, `newState`, `reason`, `timestamp`)
- Every state mutation goes through `packages/audit` → `withAudit()`, which
  writes the audit entry inside the same Prisma `$transaction`
- High-risk mutations (rejections, overrides) require a non-empty reason
- Global RBAC top-bar switcher: **Standard User** (Tier 1, maker) and
  **Admin User** (Tier 2, checker)
- Multi-stage Node 20 Alpine Dockerfile + `docker-compose.yml` per app;
  CI (lint, test, build) via `.github/workflows/ci.yml`

## Developing

```sh
pnpm install          # install workspace deps
pnpm dev              # dev servers via turbo (kyc-queue: http://localhost:3000)
pnpm lint             # lint all packages
pnpm test             # unit tests (isolated sqlite test DB)
pnpm build            # production builds

pnpm db:seed          # seed the kyc-queue dev database
pnpm db:seed:flags    # seed the feature-flag-admin dev database
```

`DATABASE_URL` defaults to `file:./dev.db`, resolved relative to
`packages/db/prisma/schema.prisma` (see `apps/kyc-queue/.env.example`).

## Apps

| App                | Path                      | Description                                                  |
| ------------------ | ------------------------- | ------------------------------------------------------------ |
| KYC Review Queue   | `apps/kyc-queue`          | Compliance queue for reviewing KYC applications              |
| Feature Flag Admin | `apps/feature-flag-admin` | Flag state/rollout admin; prod mutations gated to admin + reason |

See each app's `README.md` for local setup.
