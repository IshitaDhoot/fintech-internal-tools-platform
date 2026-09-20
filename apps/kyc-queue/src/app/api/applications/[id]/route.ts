import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/role";
import { allowedActions, type AppStatus } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const app = await prisma.userApplication.findUnique({
    where: { id: params.id },
  });
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: { resourceType: "UserApplication", resourceId: app.id },
    orderBy: { timestamp: "desc" },
  });

  const role = getRole();
  const status = app.status as AppStatus;

  return NextResponse.json({
    application: {
      id: app.id,
      fullName: app.fullName,
      email: app.email,
      riskScore: app.riskScore,
      status,
      ssnLast4: app.ssnLast4,
      submittedAt: app.submittedAt.toISOString(),
      dateOfBirth: app.dateOfBirth,
      address: app.address,
      idDocument: app.idDocument,
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
    actions: allowedActions(role, status),
  });
}
