import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { applyTransition, TransitionError } from "@/lib/transitions";
import { getActorEmail, getRole } from "@repo/rbac/server";
import type { Action } from "@repo/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const role = getRole();
  try {
    const updated = await applyTransition(prisma, {
      applicationId: params.id,
      action: body.action as Action,
      reason: body.reason,
      actorRole: role,
      actorEmail: getActorEmail(role),
    });
    return NextResponse.json({ application: updated });
  } catch (e) {
    if (e instanceof TransitionError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
