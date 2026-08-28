import { AdminShell } from "@/components/admin-shell";
import { verifyMetricEntryForm } from "@/app/(admin)/admin/community-actions";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/session";

export default async function AdminVerificationPage() {
  await requirePlatformAdmin();
  const entries = await prisma.metricEntry.findMany({
    where: {
      OR: [
        { resultStatus: { in: ["FLAGGED", "HIDDEN"] } },
        { verificationType: "SELF_REPORTED" },
      ],
    },
    include: {
      metricDefinition: true,
      athleteProfile: { select: { firstName: true, lastName: true } },
    },
    orderBy: { recordedAt: "desc" },
    take: 50,
  });

  return (
    <AdminShell
      title="Verification & flagged results"
      description="Self-reported results stay labeled until a coach or Train2Play verifies them. Flagged results are held out of rankings without accusing the athlete."
    >
      <ul className="space-y-4">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No results need review right now.</p>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold">
                {entry.athleteProfile.firstName} {entry.athleteProfile.lastName} ·{" "}
                {entry.metricDefinition.name} {entry.value} {entry.metricDefinition.unit}
              </p>
              <p className="text-xs text-slate-500">
                {entry.verificationType} · {entry.resultStatus} ·{" "}
                {entry.recordedAt.toLocaleDateString()}
              </p>
              <form action={verifyMetricEntryForm} className="mt-3 grid gap-2 sm:grid-cols-4">
                <input type="hidden" name="id" value={entry.id} />
                <select name="verificationType" defaultValue={entry.verificationType} className="h-10 rounded-lg border px-2">
                  <option value="SELF_REPORTED">Self reported</option>
                  <option value="COACH">Coach verified</option>
                  <option value="TRAIN2PLAY">Train2Play verified</option>
                </select>
                <select name="resultStatus" defaultValue={entry.resultStatus} className="h-10 rounded-lg border px-2">
                  <option value="ACTIVE">Active</option>
                  <option value="FLAGGED">Flagged</option>
                  <option value="INVALIDATED">Invalidated</option>
                  <option value="HIDDEN">Hidden</option>
                </select>
                <input name="flaggedReason" placeholder="Review note" className="h-10 rounded-lg border px-2" />
                <Button type="submit">Update</Button>
              </form>
            </li>
          ))
        )}
      </ul>
    </AdminShell>
  );
}
