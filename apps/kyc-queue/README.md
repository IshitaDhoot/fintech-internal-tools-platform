# KYC Review Queue

Internal compliance tool for reviewing KYC (Know Your Customer) applications,
built to the platform's Internal Tooling Architectural Standards.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** + Lucide icons
- **SQLite** via **Prisma ORM** — self-contained, no external services
- **Vitest** for unit tests
- Multi-stage **Node 20 Alpine** Dockerfile + `docker-compose.yml`

Shared code comes from the workspace packages — the app imports, never
reimplements: `@repo/db` (Prisma client + `AuditLog`), `@repo/audit`
(`withAudit()` + reason validation), `@repo/rbac` (`Role`, `useRole()`,
`<Can/>`, permission matrix), `@repo/ui` (`DataTable`, `Modal`, `StatusBadge`,
`RoleSwitcher`), `@repo/config` (eslint/tsconfig/tailwind presets).

## Data model

Defined in `packages/db/prisma/schema.prisma`:

| Model              | Fields                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `UserApplication`  | `id`, `fullName`, `email`, `riskScore` (0–100), `status` (PENDING/FLAGGED/APPROVED/REJECTED), `ssnLast4`, `submittedAt`, plus mock document fields (`dateOfBirth`, `address`, `idDocument`) |
| `AuditLog`         | `id`, `resourceType`, `resourceId`, `actorEmail`, `actorRole`, `previousState`, `newState`, `reason`, `timestamp` |

## Architecture

```
src/
  app/
    queue/page.tsx                    # server-rendered queue dashboard
    queue/[id]/page.tsx               # deep-linkable detail page (same body as the modal)
    api/applications/[id]/route.ts    # GET detail payload for the modal
    api/applications/[id]/transition/route.ts  # POST state transitions
  components/
    QueueTable.tsx                    # column config over @repo/ui DataTable + detail modal
    ApplicationDetailModal.tsx        # fetches the detail payload inside @repo/ui Modal
    ApplicationDetail.tsx             # shared detail body (metadata, docs, actions, audit)
    ReviewActions.tsx                 # RBAC-aware action buttons + reason capture
    DocumentPanel.tsx                 # mock document-verification comparison
    AuditTrail.tsx                    # immutable audit timeline
  lib/
    transitions.ts                    # applyTransition — validation + withAudit() write
    format.ts                         # status/risk → StatusBadge tone mapping
scripts/
  seed.ts                             # 17 realistic applications across all states
tests/
  transitions.test.ts                 # reason validation, RBAC matrix, atomicity
```

`Role`, the permission matrix (`canPerform` / `reasonRequired` /
`allowedActions`), and cookie-backed actor resolution (`getRole`) live in
`@repo/rbac`; the Prisma schema, migrations, and client singleton live in
`@repo/db`; the atomic mutation wrapper lives in `@repo/audit`.

### Compliance invariants

- **Atomic mutations** — `applyTransition` updates `UserApplication.status` and
  inserts the `AuditLog` row via `withAudit()` (one `prisma.$transaction`); if
  either write fails, both roll back.
- **Mandatory justification** — rejections, flags, flagged-record resolutions,
  and terminal-state overrides all fail validation with an empty reason.
- **RBAC** — the `kyc-role` cookie (`standard` | `admin`) is set by the top-bar
  switcher. Pending: standard can approve/reject/flag (flag needs a note),
  admin can approve/reject (flag hidden). Flagged: standard sees disabled
  actions + "Requires Admin Review"; admin resolves with a mandatory note.
  Terminal: standard is read-only; admin may override to the opposite state
  with a mandatory note.

## Local setup

Run from the repo root:

```bash
pnpm install
cp apps/kyc-queue/.env.example apps/kyc-queue/.env   # DATABASE_URL="file:./dev.db"
pnpm --filter @repo/db db:migrate                     # apply migrations
pnpm db:seed                                          # seed 17 sample applications
pnpm dev                                              # http://localhost:3000 → /queue
```

Other scripts: `pnpm lint`, `pnpm test`, `pnpm build`,
`SEED_FORCE=1 pnpm db:seed` (reseed). `DATABASE_URL="file:./dev.db"` resolves
relative to `packages/db/prisma/schema.prisma`.

## Docker

```bash
cd apps/kyc-queue
docker compose up --build     # builds from the repo root, migrates + seeds, serves on :3000
```

The compose stack runs a `migrator` stage (`prisma migrate deploy` + seed
against a shared `sqlite-data` volume) before the standalone Next.js runner.

## CI

`.github/workflows/ci.yml` (repo root) runs pnpm install → prisma generate →
lint → vitest → `next build` on pushes/PRs touching the app or `packages/`.
