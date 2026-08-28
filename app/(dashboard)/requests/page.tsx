import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  approveConnectionRequestAction,
  declineConnectionRequestAction,
} from "@/app/(dashboard)/connections/actions";
import { COACH_INBOX_STATUSES, expireStaleDiscoveryRequests } from "@/lib/coach-connections";
import { buildSafeIdentity } from "@/lib/community/privacy";
import { requireCoach } from "@/lib/session";
import { isTrainer } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function CoachAthleteRequestsPage() {
  const coach = await requireCoach();
  if (isTrainer(coach.role)) redirect("/trainer");
  await expireStaleDiscoveryRequests({ coachUserId: coach.id });
  const requests = await prisma.coachAthleteConnection.findMany({
    where: {
      coachUserId: coach.id,
      status: { in: [...COACH_INBOX_STATUSES] },
    },
    include: {
      athleteProfile: {
        include: {
          sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
          memberships: {
            include: { organization: { select: { name: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <DashboardShell
      title="Athlete requests"
      description="Approve Find a Coach and coach-code requests. Accepting creates the existing Train2Play coaching relationship."
    >
      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          No pending athlete requests.
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((row) => {
            const identity = buildSafeIdentity(row.athleteProfile);
            const approve = approveConnectionRequestAction.bind(null, row.id);
            const decline = declineConnectionRequestAction.bind(null, row.id);
            const waitingOnGuardian =
              row.guardianApprovalRequired && !row.guardianApprovedAt;
            return (
              <li key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold">{identity.displayName}</p>
                <p className="text-sm text-slate-500">
                  {[identity.sport, identity.position, identity.ageGroup, identity.organizationName]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                {row.requestedSpecialty ? (
                  <p className="mt-1 text-sm">Requested: {row.requestedSpecialty}</p>
                ) : null}
                {row.athleteNote ? (
                  <p className="mt-1 text-sm text-slate-600">“{row.athleteNote}”</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-400">
                  {row.source === "DISCOVERY" ? "Find a Coach" : "Coach code"} ·{" "}
                  {row.requestedAt.toLocaleDateString()}
                  {row.guardianApprovalRequired
                    ? row.guardianApprovedAt
                      ? " · Guardian approved"
                      : " · Waiting on guardian"
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {waitingOnGuardian ? (
                    <p className="text-sm text-amber-700">Waiting on guardian approval before you can accept.</p>
                  ) : (
                    <form action={approve}>
                      <Button type="submit">Accept</Button>
                    </form>
                  )}
                  <form action={decline}>
                    <Button type="submit" variant="outline">
                      Decline
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
