import { Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countAthletesForSport, countCoachesForSport } from "@/lib/admin-analytics";
import { prisma } from "@/lib/db";

export default async function AdminDirectorsPage() {
  const directors = await prisma.user.findMany({
    where: { role: "TRAINER" },
    include: {
      organizationMemberships: { include: { organization: true } },
      directorSportAssignments: {
        where: { isActive: true },
        include: { sport: true, organization: true },
      },
      courses: {
        where: { origin: "PLATFORM" },
        select: { id: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const rows = await Promise.all(
    directors.map(async (director) => {
      const sports = [
        ...new Set(
          director.directorSportAssignments.map(
            (assignment) => assignment.sport.name,
          ),
        ),
      ];
      const [athletes, coaches] = await Promise.all([
        Promise.all(sports.map((sport) => countAthletesForSport(sport))),
        Promise.all(sports.map((sport) => countCoachesForSport(sport))),
      ]);
      const recentPlans = await prisma.trainingPlan.count({
        where: {
          coachId: director.id,
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
      });
      return {
        director,
        sports,
        athletes: athletes.reduce((sum, count) => sum + count, 0),
        coaches: coaches.reduce((sum, count) => sum + count, 0),
        recentPlans,
      };
    }),
  );

  return (
    <AdminShell
      title="Directors"
      description="People authorized to operate one or more sport programs."
      action={
        <Button
          nativeButton={false}
          render={
            <Link href="/admin/directors/new">
              <Plus className="size-4" />
              Add director
            </Link>
          }
        />
      }
    >
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <ShieldCheck className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 font-bold">No Directors yet.</p>
          <p className="text-sm text-slate-500">
            Add a Director, then authorize sports and organizations.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="p-3">Director</th>
                  <th className="p-3">Organizations</th>
                  <th className="p-3">Sports</th>
                  <th className="p-3">Athletes under program</th>
                  <th className="p-3">Coaches</th>
                  <th className="p-3">Last active</th>
                  <th className="p-3">Program health</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ director, sports, athletes, coaches, recentPlans }) => (
                  <tr key={director.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <Link
                        href={`/admin/directors/${director.id}`}
                        className="font-semibold hover:text-brand"
                      >
                        {director.name}
                      </Link>
                      <span className="block text-xs text-slate-500">
                        {director.email}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {[
                        ...new Set([
                          ...director.organizationMemberships.map(
                            (membership) => membership.organization.name,
                          ),
                          ...director.directorSportAssignments.flatMap(
                            (assignment) =>
                              assignment.organization
                                ? [assignment.organization.name]
                                : [],
                          ),
                        ]),
                      ].join(", ") || "Platform-wide"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {sports.length ? (
                          sports.map((sport) => (
                            <Badge key={sport} variant="outline">
                              {sport}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-400">No access assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">{athletes}</td>
                    <td className="p-3">{coaches}</td>
                    <td className="p-3 text-slate-600">
                      {director.lastActiveAt?.toLocaleDateString() ?? "Not recorded"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          !director.isActive
                            ? "outline"
                            : recentPlans > 0
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {!director.isActive
                          ? "Inactive account"
                          : recentPlans > 0
                            ? `${recentPlans} plans · 30d`
                            : "No recent plans"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">
            {rows.map(({ director, sports, athletes, coaches }) => (
              <Link
                key={director.id}
                href={`/admin/directors/${director.id}`}
                className="block p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{director.name}</p>
                    <p className="text-xs text-slate-500">{director.email}</p>
                  </div>
                  <Badge variant={director.isActive ? "secondary" : "outline"}>
                    {director.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {sports.join(", ") || "No sports"} · {athletes} athletes · {coaches} coaches
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
