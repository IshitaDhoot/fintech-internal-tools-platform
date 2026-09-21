import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@repo/db";
import { getRole } from "@repo/rbac/server";
import {
  allowedFlagActions,
  type FlagEnvironment,
  type FlagState,
} from "@repo/rbac/flags";
import { FlagDetail } from "@/components/FlagDetail";
import { FLAG_ROLE_COOKIE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function FlagDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const flag = await prisma.featureFlag.findUnique({
    where: { id: params.id },
  });
  if (!flag) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { resourceType: "FeatureFlag", resourceId: flag.id },
    orderBy: { timestamp: "desc" },
  });

  const role = getRole(FLAG_ROLE_COOKIE);
  const env = flag.environment as FlagEnvironment;
  const state = flag.state as FlagState;

  return (
    <div>
      <Link
        href="/flags"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to flags
      </Link>
      <FlagDetail
        flag={{
          id: flag.id,
          key: flag.key,
          description: flag.description,
          environment: env,
          state,
          rolloutPercentage: flag.rolloutPercentage,
          ownerEmail: flag.ownerEmail,
          updatedAt: flag.updatedAt.toISOString(),
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
        actions={allowedFlagActions(role, env, state)}
      />
    </div>
  );
}
