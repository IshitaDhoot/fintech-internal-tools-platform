import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { getRole } from "@repo/rbac/server";
import {
  allowedFlagActions,
  type FlagEnvironment,
  type FlagState,
} from "@repo/rbac/flags";
import { FLAG_ROLE_COOKIE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const flag = await prisma.featureFlag.findUnique({
    where: { id: params.id },
  });
  if (!flag) {
    return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: { resourceType: "FeatureFlag", resourceId: flag.id },
    orderBy: { timestamp: "desc" },
  });

  const role = getRole(FLAG_ROLE_COOKIE);
  const env = flag.environment as FlagEnvironment;
  const state = flag.state as FlagState;

  return NextResponse.json({
    flag: {
      id: flag.id,
      key: flag.key,
      description: flag.description,
      environment: env,
      state,
      rolloutPercentage: flag.rolloutPercentage,
      ownerEmail: flag.ownerEmail,
      updatedAt: flag.updatedAt.toISOString(),
    },
    auditLogs: auditLogs.map((l) => ({
      id: l.id,
      actorEmail: l.actorEmail,
      actorRole: l.actorRole,
      previousState: l.previousState,
      newState: l.newState,
      reason: l.reason,
      timestamp: l.timestamp.toISOString(),
    })),
    role,
    actions: allowedFlagActions(role, env, state),
  });
}
