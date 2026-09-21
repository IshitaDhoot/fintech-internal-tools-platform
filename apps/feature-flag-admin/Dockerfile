# syntax=docker/dockerfile:1
# Build context is the REPO ROOT (pnpm workspace), e.g.:
#   docker build -f apps/feature-flag-admin/Dockerfile .

# ---- base: node + pnpm ----
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate
WORKDIR /app

# ---- deps: workspace manifests only, then frozen install ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/feature-flag-admin/package.json apps/feature-flag-admin/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/audit/package.json packages/audit/
COPY packages/rbac/package.json packages/rbac/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

# ---- migrator: runs `prisma migrate deploy` + seed against the shared volume ----
FROM deps AS migrator
COPY packages/db ./packages/db
COPY apps/feature-flag-admin/scripts ./apps/feature-flag-admin/scripts
ENV DATABASE_URL=file:/data/dev.db
CMD ["sh", "-c", "pnpm --filter @repo/db db:migrate && pnpm --filter feature-flag-admin db:seed"]

# ---- builder ----
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/data/dev.db
RUN pnpm build --filter feature-flag-admin

# Stage the generated Prisma client + query engine so the runner can copy them
# by directory name (Docker COPY cannot glob directory destinations).
RUN mkdir -p /export/prisma && cp -r node_modules/.pnpm/@prisma* /export/prisma/

# ---- runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/dev.db

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
    && mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/apps/feature-flag-admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/feature-flag-admin/.next/static ./apps/feature-flag-admin/.next/static

# Prisma's generated client and query engine are runtime assets that Next's
# standalone output tracing does not include; restore them under node_modules/.pnpm.
COPY --from=builder /export/prisma/ ./node_modules/.pnpm/

USER nextjs
EXPOSE 3000

CMD ["node", "apps/feature-flag-admin/server.js"]
