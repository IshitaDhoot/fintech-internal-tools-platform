import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { applyFlagMutation, FlagError } from "@/lib/flags";
import { getActorEmail, getRole } from "@repo/rbac/server";
import type { FlagAction } from "@repo/rbac/flags";
import { FLAG_ROLE_COOKIE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { action?: string; rolloutPercentage?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const role = getRole(FLAG_ROLE_COOKIE);
  try {
    const updated = await applyFlagMutation(prisma, {
      flagId: params.id,
      action: body.action as FlagAction,
      rolloutPercentage: body.rolloutPercentage,
      reason: body.reason,
      actorRole: role,
      actorEmail: getActorEmail(role),
    });
    return NextResponse.json({ flag: updated });
  } catch (e) {
    if (e instanceof FlagError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
