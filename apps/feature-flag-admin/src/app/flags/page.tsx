import { prisma } from "@repo/db";
import { FlagsTable } from "@/components/FlagsTable";

export const dynamic = "force-dynamic";

export default async function FlagsPage() {
  const flags = await prisma.featureFlag.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const rows = flags.map((f) => ({
    id: f.id,
    key: f.key,
    description: f.description,
    environment: f.environment,
    state: f.state,
    rolloutPercentage: f.rolloutPercentage,
    ownerEmail: f.ownerEmail,
    updatedAt: f.updatedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Feature Flags</h1>
        <p className="text-sm text-slate-500">
          {flags.length} flags across dev, staging and prod
        </p>
      </div>
      <FlagsTable rows={rows} />
    </div>
  );
}
