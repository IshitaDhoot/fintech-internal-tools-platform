import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@repo/db";
import { applyTransition, TransitionError } from "@/lib/transitions";
import { canPerform, reasonRequired } from "@repo/rbac";

const TEST_DB = path.join(process.cwd(), "tests", "test.db");
const TEST_URL = `file:${TEST_DB}`;

let prisma: PrismaClient;

async function seedApp(status: "PENDING" | "FLAGGED" | "APPROVED" | "REJECTED") {
  return prisma.userApplication.create({
    data: {
      fullName: "Test User",
      email: "test@example.com",
      riskScore: 50,
      status,
      ssnLast4: "0000",
      dateOfBirth: "1990-01-01",
      address: "1 Main St",
      idDocument: "US Passport",
    },
  });
}

function auditLogsFor(applicationId: string) {
  return prisma.auditLog.findMany({
    where: { resourceType: "UserApplication", resourceId: applicationId },
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
  await prisma.userApplication.deleteMany();
});

describe("reason validation", () => {
  it("rejects a rejection without a reason", async () => {
    const app = await seedApp("PENDING");
    await expect(
      applyTransition(prisma, {
        applicationId: app.id,
        action: "reject",
        ...STANDARD,
      })
    ).rejects.toThrow(TransitionError);
    const unchanged = await prisma.userApplication.findUnique({
      where: { id: app.id },
    });
    expect(unchanged?.status).toBe("PENDING");
  });

  it("rejects a flag without a reason", async () => {
    const app = await seedApp("PENDING");
    await expect(
      applyTransition(prisma, {
        applicationId: app.id,
        action: "flag",
        ...STANDARD,
      })
    ).rejects.toThrow("reason is required");
  });

  it("rejects a terminal-state admin override without a note", async () => {
    const app = await seedApp("APPROVED");
    await expect(
      applyTransition(prisma, {
        applicationId: app.id,
        action: "reject",
        ...ADMIN,
      })
    ).rejects.toThrow(TransitionError);
  });

  it("rejects an admin resolving a flagged record without a note", async () => {
    const app = await seedApp("FLAGGED");
    await expect(
      applyTransition(prisma, {
        applicationId: app.id,
        action: "approve",
        ...ADMIN,
      })
    ).rejects.toThrow("reason is required");
  });

  it("allows standard-user approval of a pending application without a reason", async () => {
    const app = await seedApp("PENDING");
    const updated = await applyTransition(prisma, {
      applicationId: app.id,
      action: "approve",
      ...STANDARD,
    });
    expect(updated.status).toBe("APPROVED");
  });
});

describe("audit logging", () => {
  it("creates an AuditLog entry for every status update", async () => {
    const app = await seedApp("PENDING");
    await applyTransition(prisma, {
      applicationId: app.id,
      action: "reject",
      reason: "Blurry ID photo",
      ...STANDARD,
    });

    const logs = await auditLogsFor(app.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      resourceType: "UserApplication",
      resourceId: app.id,
      actorEmail: "standard.user@fintech.internal",
      actorRole: "standard",
      previousState: "PENDING",
      newState: "REJECTED",
      reason: "Blurry ID photo",
    });
    expect(logs[0].timestamp).toBeInstanceOf(Date);
  });

  it("does not write an audit entry when the transition fails", async () => {
    const app = await seedApp("PENDING");
    await expect(
      applyTransition(prisma, {
        applicationId: app.id,
        action: "reject",
        ...STANDARD,
      })
    ).rejects.toThrow();
    expect(await auditLogsFor(app.id)).toHaveLength(0);
  });
});

describe("atomic transaction", () => {
  it("rolls back the status update when the audit insert fails", async () => {
    const app = await seedApp("PENDING");
    // DB-level sabotage: abort every AuditLog insert inside the transaction,
    // which must roll back the accompanying status update.
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER fail_audit_insert BEFORE INSERT ON AuditLog
       BEGIN SELECT RAISE(ABORT, 'simulated audit insert failure'); END`
    );
    try {
      await expect(
        applyTransition(prisma, {
          applicationId: app.id,
          action: "approve",
          ...STANDARD,
        })
      ).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER fail_audit_insert`);
    }

    const unchanged = await prisma.userApplication.findUnique({
      where: { id: app.id },
    });
    expect(unchanged?.status).toBe("PENDING");
    expect(await auditLogsFor(app.id)).toHaveLength(0);
  });
});

describe("RBAC matrix", () => {
  it("hides flag from admin on pending records", () => {
    expect(canPerform("admin", "PENDING", "flag")).toBe(false);
    expect(canPerform("admin", "PENDING", "approve")).toBe(true);
    expect(canPerform("admin", "PENDING", "reject")).toBe(true);
  });

  it("disables all actions for standard users on flagged records", async () => {
    const app = await seedApp("FLAGGED");
    for (const action of ["approve", "reject", "flag"] as const) {
      expect(canPerform("standard", "FLAGGED", action)).toBe(false);
      await expect(
        applyTransition(prisma, {
          applicationId: app.id,
          action,
          reason: "test",
          ...STANDARD,
        })
      ).rejects.toThrow(TransitionError);
    }
  });

  it("requires notes for admin resolving flagged records", () => {
    expect(reasonRequired("admin", "FLAGGED", "approve")).toBe(true);
    expect(reasonRequired("admin", "FLAGGED", "reject")).toBe(true);
  });

  it("lets admin override terminal states but only to the opposite state", async () => {
    const app = await seedApp("APPROVED");
    expect(canPerform("admin", "APPROVED", "reject")).toBe(true);
    expect(canPerform("admin", "APPROVED", "approve")).toBe(false);
    const updated = await applyTransition(prisma, {
      applicationId: app.id,
      action: "reject",
      reason: "Post-approval fraud signal",
      ...ADMIN,
    });
    expect(updated.status).toBe("REJECTED");
    const logs = await auditLogsFor(app.id);
    expect(logs[0]).toMatchObject({
      actorRole: "admin",
      previousState: "APPROVED",
      newState: "REJECTED",
    });
  });

  it("gives standard users no actions on terminal records", () => {
    expect(canPerform("standard", "APPROVED", "reject")).toBe(false);
    expect(canPerform("standard", "REJECTED", "approve")).toBe(false);
    expect(canPerform("standard", "APPROVED", "flag")).toBe(false);
  });
});
