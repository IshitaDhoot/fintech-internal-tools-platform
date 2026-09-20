import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@repo/db";
import { getRole } from "@repo/rbac/server";
import { allowedActions, type AppStatus } from "@repo/rbac";
import { ApplicationDetail } from "@/components/ApplicationDetail";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const app = await prisma.userApplication.findUnique({
    where: { id: params.id },
  });
  if (!app) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { resourceType: "UserApplication", resourceId: app.id },
    orderBy: { timestamp: "desc" },
  });

  const role = getRole();
  const status = app.status as AppStatus;

  return (
    <div>
      <Link
        href="/queue"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to queue
      </Link>
      <ApplicationDetail
        app={{
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
        }}
        auditLogs={auditLogs.map((l) => ({
          id: l.id,
          actorEmail: l.actorEmail,
          actorRole: l.actorRole,
          previousState: l.previousState,
          newState: l.newState,
          reason: l.reason,
          timestamp: l.timestamp.toISOString(),
        }))}
        role={role}
        actions={allowedActions(role, status)}
      />
    </div>
  );
}
