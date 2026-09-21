# Feature Flag Admin

Internal admin panel for product feature flags, built to the platform's
Internal Tooling Architectural Standards. Lives at `/flags` (dev server:
http://localhost:3001).

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** + Lucide icons
- **SQLite** via **Prisma ORM** — self-contained, no external services
- **Vitest** for unit tests
- Multi-stage **Node 20 Alpine** Dockerfile + `docker-compose.yml`

Shared code comes from the workspace packages — the app imports, never
reimplements: `@repo/db` (Prisma client + `AuditLog`), `@repo/audit`
(`withAudit()` + reason validation), `@repo/rbac` (`Role`, `useRole()`,
`<Can/>`) + `@repo/rbac/flags` (flag permission matrix), `@repo/ui`
(`DataTable`, `Modal`, `StatusBadge`, `RoleSwitcher`), `@repo/config`
(eslint/tsconfig/tailwind presets).

## Data model

Defined in `packages/db/prisma/schema.prisma`:

| Model         | Fields                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `FeatureFlag` | `id`, `key` (unique, e.g. `checkout.new_ui`), `description`, `environment` (dev/staging/prod), `state` (enabled/disabled/archived), `rolloutPercentage` (0–100), `ownerEmail`, `updatedAt` |
| `AuditLog`    | `id`, `resourceType`, `resourceId`, `actorEmail`, `actorRole`, `previousState`, `newState`, `reason`, `timestamp` |

Audit state columns store compact `state@rollout%` snapshots (e.g.
`enabled@45%`), `proposed:<snapshot>` for maker proposals, and `deleted` for
deletions.

## Architecture

```
src/
  app/
    flags/page.tsx                    # server-rendered flags dashboard
    flags/[id]/page.tsx               # deep-linkable detail page (same body as the modal)
    api/flags/[id]/route.ts           # GET detail payload for the modal
    api/flags/[id]/mutate/route.ts    # POST toggle / set_rollout / archive / delete
    api/flags/[id]/propose/route.ts   # POST maker proposal (standard on prod)
  components/
    FlagsTable.tsx                    # column config over @repo/ui DataTable + detail modal
    FlagDetailModal.tsx               # fetches the detail payload inside @repo/ui Modal
    FlagDetail.tsx                    # shared detail body (metadata, actions, audit)
    FlagActions.tsx                   # RBAC-aware action buttons + reason capture
    RolloutMeter.tsx                  # rollout percentage progress meter
    AuditTrail.tsx                    # immutable audit timeline
  lib/
    flags.ts                          # applyFlagMutation / proposeFlagChange — validation + withAudit() write
    format.ts                         # state/env → StatusBadge tone mapping
    constants.ts                      # FLAG_ROLE_COOKIE ("flags-role")
scripts/
  seed.ts                             # 17 realistic flags across all envs/states
tests/
  flags.test.ts                       # reason validation, RBAC matrix, atomicity, proposals
```

## RBAC matrix

`prod` is the high-risk boundary (Checker territory); `dev`/`staging` are
low-risk (Maker territory):

| Action                             | standard              | admin                 |
| ---------------------------------- | --------------------- | --------------------- |
| toggle / set_rollout on dev+staging | ✓ (no reason)         | ✓ (no reason)         |
| toggle / set_rollout on prod        | ✗ — propose only      | ✓ (**reason required**) |
| propose on prod                     | ✓ (audit-logged)      | n/a — admin applies   |
| archive / delete                    | ✗                     | ✓ (**reason required**) |

- `archived` is terminal: no toggle/rollout; admin may still delete.
- Standard users on prod flags see disabled mutate buttons with a
  **Requires Admin** badge plus maker **Propose** controls.
- Enforcement is server-side in `applyFlagMutation` / `proposeFlagChange`;
  the API returns 403 for disallowed roles and 400 for missing reasons or
  invalid rollout values.
- Every applied mutation goes through `withAudit()` — the state change and
  its `AuditLog` insert commit or roll back together.

The top-bar role switcher is a dev stand-in for SSO; it writes the
`flags-role` cookie, read in one place via `useRole()`/`getRole()`.

## Local setup

```sh
pnpm install
pnpm --filter @repo/db db:generate
pnpm --filter @repo/db exec prisma migrate deploy   # DATABASE_URL=file:./dev.db
pnpm --filter feature-flag-admin db:seed            # seed 17 flags
pnpm --filter feature-flag-admin dev                # http://localhost:3001/flags
```

## Docker

```sh
docker compose -f apps/feature-flag-admin/docker-compose.yml up --build
# → http://localhost:3001/flags (migrator service seeds the shared volume first)
```

## Tests

```sh
pnpm --filter feature-flag-admin test
```

Covers: prod mutations without a reason → 400, standard-on-prod → 403,
atomic rollback when the audit insert fails (SQLite trigger sabotage),
maker proposals write audit rows without mutating the flag, and rollout
bounds validation.
