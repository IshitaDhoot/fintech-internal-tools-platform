import { prisma } from "@/lib/prisma";
import { QueueTable } from "@/components/QueueTable";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const applications = await prisma.userApplication.findMany({
    orderBy: { submittedAt: "desc" },
  });

  const rows = applications.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    email: a.email,
    riskScore: a.riskScore,
    status: a.status,
    submittedAt: a.submittedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Review Queue</h1>
        <p className="text-sm text-slate-500">
          {applications.length} applications awaiting compliance review
        </p>
      </div>
      <QueueTable rows={rows} />
    </div>
  );
}
