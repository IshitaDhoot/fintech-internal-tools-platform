import { PrismaClient } from "@repo/db";

const prisma = new PrismaClient();

const records: Array<{
  key: string;
  description: string;
  environment: "dev" | "staging" | "prod";
  state: "enabled" | "disabled" | "archived";
  rolloutPercentage: number;
  ownerEmail: string;
  daysAgo: number;
}> = [
  { key: "checkout.new_ui", description: "Redesigned checkout flow with inline validation", environment: "prod", state: "enabled", rolloutPercentage: 45, ownerEmail: "sarah.lin@fintech.internal", daysAgo: 2 },
  { key: "payments.retry_v2", description: "Exponential-backoff retry for failed card charges", environment: "prod", state: "enabled", rolloutPercentage: 100, ownerEmail: "marcus.chen@fintech.internal", daysAgo: 14 },
  { key: "kyc.auto_approve_low_risk", description: "Auto-approve KYC applications scoring below 20", environment: "prod", state: "disabled", rolloutPercentage: 0, ownerEmail: "priya.raman@fintech.internal", daysAgo: 5 },
  { key: "ledger.dual_write", description: "Shadow-write transactions to the new ledger service", environment: "prod", state: "enabled", rolloutPercentage: 10, ownerEmail: "diego.fernandez@fintech.internal", daysAgo: 1 },
  { key: "fx.realtime_quotes", description: "Streaming FX quotes instead of 30s polling", environment: "prod", state: "archived", rolloutPercentage: 100, ownerEmail: "ingrid.larsen@fintech.internal", daysAgo: 30 },
  { key: "reports.async_export", description: "Queue large report exports to a worker", environment: "staging", state: "enabled", rolloutPercentage: 75, ownerEmail: "tommy.nguyen@fintech.internal", daysAgo: 3 },
  { key: "auth.step_up_mfa", description: "Require MFA step-up for payout changes", environment: "staging", state: "disabled", rolloutPercentage: 0, ownerEmail: "hana.yoshida@fintech.internal", daysAgo: 6 },
  { key: "dashboard.v2_widgets", description: "New dashboard widget grid layout", environment: "staging", state: "enabled", rolloutPercentage: 50, ownerEmail: "sofia.petrova@fintech.internal", daysAgo: 4 },
  { key: "alerts.pager_routing", description: "Route ops alerts to PagerDuty by service", environment: "staging", state: "archived", rolloutPercentage: 0, ownerEmail: "robert.delgado@fintech.internal", daysAgo: 21 },
  { key: "onboarding.progressive_form", description: "Multi-step onboarding form", environment: "dev", state: "enabled", rolloutPercentage: 100, ownerEmail: "layla.haddad@fintech.internal", daysAgo: 1 },
  { key: "search.fuzzy_matching", description: "Fuzzy matching in transaction search", environment: "dev", state: "enabled", rolloutPercentage: 60, ownerEmail: "kwame.mensah@fintech.internal", daysAgo: 2 },
  { key: "billing.proration_v2", description: "Revised proration math for mid-cycle plan changes", environment: "dev", state: "disabled", rolloutPercentage: 0, ownerEmail: "emily.sorensen@fintech.internal", daysAgo: 7 },
  { key: "mobile.biometric_login", description: "Face ID / fingerprint login for mobile app", environment: "dev", state: "enabled", rolloutPercentage: 25, ownerEmail: "andrei.volkov@fintech.internal", daysAgo: 0 },
  { key: "transfers.instant_ach", description: "Same-day ACH rail for transfers under $5k", environment: "prod", state: "disabled", rolloutPercentage: 0, ownerEmail: "james.whitfield@fintech.internal", daysAgo: 9 },
  { key: "cache.edge_personalization", description: "Edge-cached personalized dashboard payloads", environment: "dev", state: "archived", rolloutPercentage: 0, ownerEmail: "fatima.alsayed@fintech.internal", daysAgo: 40 },
  { key: "compliance.travel_rule", description: "Travel-rule data capture for crypto transfers", environment: "prod", state: "enabled", rolloutPercentage: 30, ownerEmail: "lucas.moreau@fintech.internal", daysAgo: 4 },
  { key: "support.chat_widget", description: "In-app support chat widget", environment: "staging", state: "enabled", rolloutPercentage: 100, ownerEmail: "nia.thompson@fintech.internal", daysAgo: 11 },
];

async function main() {
  const existing = await prisma.featureFlag.count();
  if (existing > 0 && process.env.SEED_FORCE !== "1") {
    console.log(
      `Database already has ${existing} flags — skipping seed (set SEED_FORCE=1 to reseed).`
    );
    return;
  }
  await prisma.featureFlag.deleteMany();
  await prisma.auditLog.deleteMany({
    where: { resourceType: "FeatureFlag" },
  });

  for (const r of records) {
    const updatedAt = new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000);
    const flag = await prisma.featureFlag.create({
      data: {
        key: r.key,
        description: r.description,
        environment: r.environment,
        state: r.state,
        rolloutPercentage: r.rolloutPercentage,
        ownerEmail: r.ownerEmail,
        updatedAt,
      },
    });

    // Seed plausible audit history for flags not in the default state
    if (r.state === "enabled") {
      await prisma.auditLog.create({
        data: {
          resourceType: "FeatureFlag",
          resourceId: flag.id,
          actorEmail:
            r.environment === "prod"
              ? "admin@fintech.internal"
              : r.ownerEmail,
          actorRole: r.environment === "prod" ? "admin" : "standard",
          previousState: "disabled@0%",
          newState: `enabled@${r.rolloutPercentage}%`,
          reason:
            r.environment === "prod" ? "Gradual rollout approved by ops" : null,
          timestamp: new Date(updatedAt.getTime() - 3600_000),
        },
      });
    } else if (r.state === "archived") {
      await prisma.auditLog.create({
        data: {
          resourceType: "FeatureFlag",
          resourceId: flag.id,
          actorEmail: "admin@fintech.internal",
          actorRole: "admin",
          previousState: `disabled@${r.rolloutPercentage}%`,
          newState: `archived@${r.rolloutPercentage}%`,
          reason: "Flag retired — cleanup of stale experiment",
          timestamp: new Date(updatedAt.getTime() - 1800_000),
        },
      });
    }
  }

  const count = await prisma.featureFlag.count();
  console.log(`Seeded ${count} feature flags`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
