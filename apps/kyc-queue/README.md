# KYC Review Queue

Internal compliance tool for reviewing KYC (Know Your Customer) applications,
built to the platform's Internal Tooling Architectural Standards.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** + Lucide icons
- **SQLite** via **Prisma ORM** — self-contained, no external services
- **Vitest** for unit tests
- Multi-stage **Node 20 Alpine** Dockerfile + `docker-compose.yml`

## Data model

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
    QueueTable.tsx                    # search / status filter / sort / CSV export + detail modal
    ApplicationDetailModal.tsx        # modal shell that fetches the detail payload
    ApplicationDetail.tsx             # shared detail body (metadata, docs, actions, audit)
    ReviewActions.tsx                 # RBAC-aware action buttons + reason capture
    DocumentPanel.tsx                 # mock document-verification comparison
    AuditTrail.tsx                    # immutable audit timeline
    RoleSwitcher.tsx                  # top-bar Standard/Admin switcher (kyc-role cookie)
  lib/
    rbac.ts                           # role matrix: canPerform / reasonRequired / allowedActions
    transitions.ts                    # applyTransition — validation + atomic write
    role.ts                           # cookie-backed actor resolution
    prisma.ts                         # PrismaClient singleton
prisma/
  schema.prisma
  migrations/                         # real migrations (prisma migrate deploy)
  seed.ts                             # 17 realistic applications across all states
tests/
  transitions.test.ts                 # reason validation, RBAC matrix, atomicity
```

### Compliance invariants

- **Atomic mutations** — `applyTransition` updates `UserApplication.status` and
  inserts the `AuditLog` row inside a single `prisma.$transaction`; if either
  write fails, both roll back.
- **Mandatory justification** — rejections, flags, flagged-record resolutions,
  and terminal-state overrides all fail validation with an empty reason.
- **RBAC** — the `kyc-role` cookie (`standard` | `admin`) is set by the top-bar
  switcher. Pending: standard can approve/reject/flag (flag needs a note),
  admin can approve/reject (flag hidden). Flagged: standard sees disabled
  actions + "Requires Admin Review"; admin resolves with a mandatory note.
  Terminal: standard is read-only; admin may override to the opposite state
  with a mandatory note.

## Local setup

```bash
cd apps/kyc-queue
npm ci --legacy-peer-deps
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npx prisma migrate deploy     # apply migrations
npm run db:seed               # seed 17 sample applications
npm run dev                   # http://localhost:3000 → /queue
```

Other scripts: `npm run lint`, `npm run test`, `npm run build`,
`SEED_FORCE=1 npm run db:seed` (reseed).

## Docker

```bash
cd apps/kyc-queue
docker compose up --build     # migrates + seeds, serves on :3000
```

The compose stack runs a `migrator` stage (`prisma migrate deploy` + seed
against a shared `sqlite-data` volume) before the standalone Next.js runner.

## CI

`.github/workflows/ci.yml` (repo root) runs install → prisma generate → lint →
vitest → `next build` on pushes/PRs touching `apps/kyc-queue`.
