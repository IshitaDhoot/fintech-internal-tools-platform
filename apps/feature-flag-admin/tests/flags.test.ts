import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@repo/db";
import {
  applyFlagMutation,
  proposeFlagChange,
  FlagError,
} from "@/lib/flags";
import {
  canPerformFlag,
  flagReasonRequired,
} from "@repo/rbac/flags";

const TEST_DB = path.join(process.cwd(), "tests", "test.db");
const TEST_URL = `file:${TEST_DB}`;

let prisma: PrismaClient;

type Env = "dev" | "staging" | "prod";
type State = "enabled" | "disabled" | "archived";

async function seedFlag(
  environment: Env,
  state: State = "disabled",
  rolloutPercentage = 0
) {
  return prisma.featureFlag.create({
    data: {
      key: `test.${Math.random().toString(36).slice(2)}`,
      description: "Test flag",
      environment,
      state,
      rolloutPercentage,
      ownerEmail: "owner@fintech.internal",
    },
  });
}

function auditLogsFor(flagId: string) {
  return prisma.auditLog.findMany({
    where: { resourceType: "FeatureFlag", resourceId: flagId },
  });
}

const STANDARD = {
  actorRole: "standard" as const,
  actorEmail: "standard.user@fintech.internal",
};
const ADMIN = { actorRole: "admin" as const, actorEmail: "admin@fintech.internal" };

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  execSync("pnpm --filter @repo/db exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: "ignore",
  });
  prisma = new PrismaClient({
    datasources: { db: { url: TEST_URL } },
  });
});

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.featureFlag.deleteMany();
});

describe("reason validation", () => {
  it("rejects a prod toggle without a reason", async () => {
    const flag = await seedFlag("prod", "disabled");
    await expect(
      applyFlagMutation(prisma, { flagId: flag.id, action: "toggle", ...ADMIN })
    ).rejects.toThrow("reason is required");
    const unchanged = await prisma.featureFlag.findUnique({
      where: { id: flag.id },
    });
    expect(unchanged?.state).toBe("disabled");
  });

  it("rejects a prod rollout change without a reason", async () => {
    const flag = await seedFlag("prod", "enabled", 25);
    await expect(
      applyFlagMutation(prisma, {
        flagId: flag.id,
        action: "set_rollout",
        rolloutPercentage: 80,
        ...ADMIN,
      })
    ).rejects.toThrow(FlagError);
  });

  it("rejects archive without a reason in any environment", async () => {
    for (const env of ["dev", "staging", "prod"] as const) {
      const flag = await seedFlag(env, "enabled", 10);
      await expect(
        applyFlagMutation(prisma, {
          flagId: flag.id,
          action: "archive",
          ...ADMIN,
        })
      ).rejects.toThrow(FlagError);
    }
  });

  it("rejects a whitespace-only reason on a prod mutation", async () => {
    const flag = await seedFlag("prod", "disabled");
    await expect(
      applyFlagMutation(prisma, {
        flagId: flag.id,
        action: "toggle",
        reason: "   \n\t  ",
        ...ADMIN,
      })
    ).rejects.toThrow("reason is required");
    const unchanged = await prisma.featureFlag.findUnique({
      where: { id: flag.id },
    });
    expect(unchanged?.state).toBe("disabled");
    expect(await auditLogsFor(flag.id)).toHaveLength(0);
  });

  it("rejects the delete action", async () => {
    const flag = await seedFlag("dev", "disabled");
    await expect(
      applyFlagMutation(prisma, {
        flagId: flag.id,
        action: "delete" as "toggle",
        reason: "cleanup",
        ...ADMIN,
      })
    ).rejects.toThrow("Unknown action");
    expect(
      await prisma.featureFlag.findUnique({ where: { id: flag.id } })
    ).not.toBeNull();
  });

  it("allows low-risk dev/staging mutations without a reason", async () => {
    const dev = await seedFlag("dev", "disabled");
    const enabled = await applyFlagMutation(prisma, {
      flagId: dev.id,
      action: "toggle",
      ...STANDARD,
    });
    expect(enabled.state).toBe("enabled");

    const staging = await seedFlag("staging", "enabled", 10);
    const rolled = await applyFlagMutation(prisma, {
      flagId: staging.id,
      action: "set_rollout",
      rolloutPercentage: 55,
      ...STANDARD,
    });
    expect(rolled.rolloutPercentage).toBe(55);
  });
});

describe("RBAC matrix", () => {
  it("blocks standard users from mutating prod flags server-side", async () => {
    const flag = await seedFlag("prod", "disabled");
    for (const action of ["toggle", "set_rollout", "archive"] as const) {
      expect(canPerformFlag("standard", "prod", "disabled", action)).toBe(false);
      await expect(
        applyFlagMutation(prisma, {
          flagId: flag.id,
          action,
          rolloutPercentage: 50,
          reason: "trying anyway",
          ...STANDARD,
        })
      ).rejects.toThrow(FlagError);
    }
    expect(await auditLogsFor(flag.id)).toHaveLength(0);
  });

  it("lets admin mutate prod flags with a reason", async () => {
    const flag = await seedFlag("prod", "disabled");
    const updated = await applyFlagMutation(prisma, {
      flagId: flag.id,
      action: "toggle",
      reason: "Launch approved in ops review",
      ...ADMIN,
    });
    expect(updated.state).toBe("enabled");
  });

  it("lets standard users mutate dev/staging flags", async () => {
    expect(canPerformFlag("standard", "dev", "disabled", "toggle")).toBe(true);
    expect(canPerformFlag("standard", "staging", "enabled", "set_rollout")).toBe(
      true
    );
    expect(canPerformFlag("standard", "dev", "enabled", "archive")).toBe(false);
  });

  it("treats archived flags as terminal — no toggle/rollout for anyone", async () => {
    const flag = await seedFlag("prod", "archived", 30);
    expect(canPerformFlag("admin", "prod", "archived", "toggle")).toBe(false);
    expect(canPerformFlag("admin", "prod", "archived", "set_rollout")).toBe(
      false
    );
    expect(canPerformFlag("admin", "prod", "archived", "archive")).toBe(false);
    await expect(
      applyFlagMutation(prisma, {
        flagId: flag.id,
        action: "toggle",
        reason: "unarchive",
        ...ADMIN,
      })
    ).rejects.toThrow(FlagError);
  });

  it("requires reasons only on prod mutations and archive", () => {
    expect(flagReasonRequired("prod", "toggle")).toBe(true);
    expect(flagReasonRequired("prod", "set_rollout")).toBe(true);
    expect(flagReasonRequired("dev", "toggle")).toBe(false);
    expect(flagReasonRequired("staging", "set_rollout")).toBe(false);
    expect(flagReasonRequired("dev", "archive")).toBe(true);
    expect(flagReasonRequired("staging", "archive")).toBe(true);
  });
});

describe("audit logging", () => {
  it("records state and rollout snapshots on every mutation", async () => {
    const flag = await seedFlag("staging", "enabled", 40);
    await applyFlagMutation(prisma, {
      flagId: flag.id,
      action: "set_rollout",
      rolloutPercentage: 90,
      ...STANDARD,
    });
    const logs = await auditLogsFor(flag.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      resourceType: "FeatureFlag",
      resourceId: flag.id,
      actorEmail: "standard.user@fintech.internal",
      actorRole: "standard",
      previousState: "enabled@40%",
      newState: "enabled@90%",
    });
  });

  it("does not write an audit entry when the mutation fails", async () => {
    const flag = await seedFlag("prod", "enabled", 20);
    await expect(
      applyFlagMutation(prisma, { flagId: flag.id, action: "toggle", ...ADMIN })
    ).rejects.toThrow();
    expect(await auditLogsFor(flag.id)).toHaveLength(0);
  });
});

describe("atomic transaction", () => {
  it("rolls back the flag update when the audit insert fails", async () => {
    const flag = await seedFlag("dev", "disabled");
    // DB-level sabotage: abort every AuditLog insert inside the transaction,
    // which must roll back the accompanying state update.
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER fail_audit_insert BEFORE INSERT ON AuditLog
       BEGIN SELECT RAISE(ABORT, 'simulated audit insert failure'); END`
    );
    try {
      await expect(
        applyFlagMutation(prisma, {
          flagId: flag.id,
          action: "toggle",
          ...STANDARD,
        })
      ).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER fail_audit_insert`);
    }

    const unchanged = await prisma.featureFlag.findUnique({
      where: { id: flag.id },
    });
    expect(unchanged?.state).toBe("disabled");
    expect(await auditLogsFor(flag.id)).toHaveLength(0);
  });
});

describe("proposals (maker path)", () => {
  it("lets a standard user propose a prod change without mutating the flag", async () => {
    const flag = await seedFlag("prod", "disabled", 0);
    await proposeFlagChange(prisma, {
      flagId: flag.id,
      action: "set_rollout",
      rolloutPercentage: 50,
      note: "Ramp once oncall rotation is staffed",
      ...STANDARD,
    });
    const unchanged = await prisma.featureFlag.findUnique({
      where: { id: flag.id },
    });
    expect(unchanged?.rolloutPercentage).toBe(0);
    const logs = await auditLogsFor(flag.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      actorRole: "standard",
      previousState: "disabled@0%",
      newState: "proposed:disabled@50%",
    });
  });

  it("rejects proposals on non-prod flags and from admin", async () => {
    const dev = await seedFlag("dev", "disabled");
    await expect(
      proposeFlagChange(prisma, { flagId: dev.id, action: "toggle", ...STANDARD })
    ).rejects.toThrow(FlagError);

    const prod = await seedFlag("prod", "disabled");
    await expect(
      proposeFlagChange(prisma, { flagId: prod.id, action: "toggle", ...ADMIN })
    ).rejects.toThrow(FlagError);
  });
});

describe("input validation", () => {
  it("rejects out-of-range rollout values", async () => {
    const flag = await seedFlag("prod", "enabled", 10);
    for (const bad of [-5, -1, 101, 250, 33.5]) {
      await expect(
        applyFlagMutation(prisma, {
          flagId: flag.id,
          action: "set_rollout",
          rolloutPercentage: bad,
          reason: "bounds check",
          ...ADMIN,
        })
      ).rejects.toThrow(FlagError);
    }
    const unchanged = await prisma.featureFlag.findUnique({
      where: { id: flag.id },
    });
    expect(unchanged?.rolloutPercentage).toBe(10);
    expect(await auditLogsFor(flag.id)).toHaveLength(0);
  });

  it("rejects out-of-range rollout in proposals too", async () => {
    const flag = await seedFlag("prod", "enabled", 10);
    await expect(
      proposeFlagChange(prisma, {
        flagId: flag.id,
        action: "set_rollout",
        rolloutPercentage: 250,
        ...STANDARD,
      })
    ).rejects.toThrow(FlagError);
  });
});
