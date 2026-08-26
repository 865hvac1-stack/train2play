import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const query = await searchParams;
  const search = query.search?.trim() ?? "";
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const organizations = await prisma.organization.findMany({
    where: {
      ...(query.status === "inactive"
        ? { isActive: false }
        : query.status === "active"
          ? { isActive: true }
          : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    },
    include: {
      athleteMemberships: {
        where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        select: {
          athleteProfileId: true,
          coachUserId: true,
          athleteProfile: {
            select: {
              primarySport: true,
              sports: { select: { sport: true } },
              legacyAthleteId: true,
            },
          },
        },
      },
      memberships: {
        where: { user: { isActive: true } },
        select: { userId: true, user: { select: { role: true } } },
      },
      teams: { select: { sport: true } },
      directorAssignments: {
        where: { isActive: true },
        select: { directorUserId: true, sport: { select: { name: true } } },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take: 100,
  });
  const legacyIds = organizations.flatMap((organization) =>
    organization.athleteMemberships.flatMap((membership) =>
      membership.athleteProfile.legacyAthleteId
        ? [membership.athleteProfile.legacyAthleteId]
        : [],
    ),
  );
  const completed = legacyIds.length
    ? await prisma.workoutSession.groupBy({
        by: ["athleteId"],
        where: {
          athleteId: { in: legacyIds },
          status: "COMPLETED",
          completedAt: { gte: thirtyDaysAgo },
        },
        _count: { _all: true },
      })
    : [];
  const workoutsByAthlete = new Map(
    completed.map((row) => [row.athleteId, row._count._all]),
  );

  return (
    <AdminShell
      title="Organizations"
      description="Operate academies, clubs, schools, facilities, and teams."
      action={
        <Button
          nativeButton={false}
          render={
            <Link href="/admin/organizations/new">
              <Plus className="size-4" />
              Add organization
            </Link>
          }
        />
      }
    >
      <form className="flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search organizations"
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {organizations.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-bold">No organizations yet.</p>
            <p className="text-sm text-slate-500">
              Create your first Train2Play organization.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Organization</th>
                    <th className="p-3">Athletes</th>
                    <th className="p-3">Coaches</th>
                    <th className="p-3">Directors</th>
                    <th className="p-3">Sports</th>
                    <th className="p-3">Training · 30 days</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((organization) => {
                    const athleteIds = new Set(
                      organization.athleteMemberships.map(
                        (membership) => membership.athleteProfileId,
                      ),
                    );
                    const coaches = new Set([
                      ...organization.athleteMemberships.flatMap((membership) =>
                        membership.coachUserId ? [membership.coachUserId] : [],
                      ),
                      ...organization.memberships
                        .filter((membership) =>
                          ["COACH", "STAFF", "ORG_ADMIN"].includes(
                            membership.user.role,
                          ),
                        )
                        .map((membership) => membership.userId),
                    ]);
                    const directors = new Set([
                      ...organization.directorAssignments.map(
                        (assignment) => assignment.directorUserId,
                      ),
                      ...organization.memberships
                        .filter((membership) => membership.user.role === "TRAINER")
                        .map((membership) => membership.userId),
                    ]);
                    const sports = new Set([
                      ...organization.teams.map((team) => team.sport),
                      ...organization.directorAssignments.map(
                        (assignment) => assignment.sport.name,
                      ),
                      ...organization.athleteMemberships.flatMap((membership) => [
                        ...(membership.athleteProfile.primarySport
                          ? [membership.athleteProfile.primarySport]
                          : []),
                        ...membership.athleteProfile.sports.map(
                          (sport) => sport.sport,
                        ),
                      ]),
                    ]);
                    const workouts = organization.athleteMemberships.reduce(
                      (sum, membership) =>
                        sum +
                        (membership.athleteProfile.legacyAthleteId
                          ? (workoutsByAthlete.get(
                              membership.athleteProfile.legacyAthleteId,
                            ) ?? 0)
                          : 0),
                      0,
                    );
                    return (
                      <tr key={organization.id} className="border-t border-slate-100">
                        <td className="p-3">
                          <Link
                            href={`/admin/organizations/${organization.id}`}
                            className="font-semibold hover:text-brand"
                          >
                            {organization.name}
                          </Link>
                          <span className="block text-xs text-slate-500">
                            /{organization.slug}
                          </span>
                        </td>
                        <td className="p-3">{athleteIds.size}</td>
                        <td className="p-3">{coaches.size}</td>
                        <td className="p-3">{directors.size}</td>
                        <td className="max-w-xs p-3 text-slate-600">
                          {[...sports].join(", ") || "—"}
                        </td>
                        <td className="p-3">{workouts}</td>
                        <td className="p-3">
                          <Badge
                            variant={organization.isActive ? "secondary" : "outline"}
                          >
                            {organization.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {organizations.map((organization) => (
                <Link
                  key={organization.id}
                  href={`/admin/organizations/${organization.id}`}
                  className="block p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">{organization.name}</p>
                      <p className="text-xs text-slate-500">
                        {organization.athleteMemberships.length} athlete memberships ·{" "}
                        {organization.teams.length} teams
                      </p>
                    </div>
                    <Badge variant={organization.isActive ? "secondary" : "outline"}>
                      {organization.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
