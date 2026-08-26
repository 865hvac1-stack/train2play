import { Activity, Building2, Dumbbell, Film, ShieldCheck, Trophy, Users, Volleyball } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  setOrganizationActiveAction,
  updateOrganizationAction,
} from "@/app/(admin)/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex justify-between gap-3">
        <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
          {label}
        </p>
        <Icon className="size-4 text-brand" />
      </div>
      <p className="font-heading mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      athleteMemberships: {
        where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        include: {
          athleteProfile: {
            include: {
              sports: true,
              legacyAthlete: {
                include: {
                  workoutSessions: {
                    where: {
                      status: "COMPLETED",
                      completedAt: { gte: thirtyDaysAgo },
                    },
                  },
                  trainingPlans: { where: { status: "ACTIVE" } },
                },
              },
              metricEntries: {
                where: { recordedAt: { gte: thirtyDaysAgo } },
              },
              videoReviews: {
                where: { submittedAt: { gte: thirtyDaysAgo } },
              },
              courseItemProgress: {
                where: { completedAt: { not: null } },
              },
            },
          },
          coachUser: true,
          team: true,
        },
      },
      teams: {
        include: { _count: { select: { athleteMemberships: true } } },
      },
      directorAssignments: {
        where: { isActive: true },
        include: { directorUser: true, sport: true },
      },
    },
  });
  if (!organization) notFound();

  const athleteIds = new Set(
    organization.athleteMemberships.map((membership) => membership.athleteProfileId),
  );
  const coaches = new Map<string, string>();
  for (const membership of organization.athleteMemberships) {
    if (membership.coachUser) {
      coaches.set(membership.coachUser.id, membership.coachUser.name);
    }
  }
  for (const membership of organization.memberships) {
    if (["COACH", "STAFF", "ORG_ADMIN"].includes(membership.user.role)) {
      coaches.set(membership.user.id, membership.user.name);
    }
  }
  const directors = new Map<string, string>();
  for (const assignment of organization.directorAssignments) {
    directors.set(assignment.directorUserId, assignment.directorUser.name);
  }
  for (const membership of organization.memberships) {
    if (membership.user.role === "TRAINER") {
      directors.set(membership.user.id, membership.user.name);
    }
  }

  const workouts = organization.athleteMemberships.reduce(
    (sum, membership) =>
      sum +
      (membership.athleteProfile.legacyAthlete?.workoutSessions.length ?? 0),
    0,
  );
  const activeAthletes = new Set(
    organization.athleteMemberships.flatMap((membership) =>
      (membership.athleteProfile.legacyAthlete?.workoutSessions.length ?? 0) > 0 ||
      membership.athleteProfile.metricEntries.length > 0 ||
      membership.athleteProfile.videoReviews.length > 0
        ? [membership.athleteProfileId]
        : [],
    ),
  ).size;
  const videos = organization.athleteMemberships.reduce(
    (sum, membership) => sum + membership.athleteProfile.videoReviews.length,
    0,
  );
  const prs = organization.athleteMemberships.reduce(
    (sum, membership) => sum + membership.athleteProfile.metricEntries.length,
    0,
  );
  const activePrograms = organization.athleteMemberships.reduce(
    (sum, membership) =>
      sum + (membership.athleteProfile.legacyAthlete?.trainingPlans.length ?? 0),
    0,
  );
  const courseCompletions = organization.athleteMemberships.reduce(
    (sum, membership) =>
      sum + membership.athleteProfile.courseItemProgress.length,
    0,
  );

  const sportRows = new Map<
    string,
    { athletes: Set<string>; coaches: Set<string>; directors: Set<string> }
  >();
  for (const membership of organization.athleteMemberships) {
    const sports = new Set([
      ...membership.athleteProfile.sports.map((sport) => sport.sport),
      ...(membership.athleteProfile.primarySport
        ? [membership.athleteProfile.primarySport]
        : []),
      ...(membership.team?.sport ? [membership.team.sport] : []),
    ]);
    for (const sport of sports) {
      const row = sportRows.get(sport) ?? {
        athletes: new Set(),
        coaches: new Set(),
        directors: new Set(),
      };
      row.athletes.add(membership.athleteProfileId);
      if (membership.coachUserId) row.coaches.add(membership.coachUserId);
      sportRows.set(sport, row);
    }
  }
  for (const assignment of organization.directorAssignments) {
    const row = sportRows.get(assignment.sport.name) ?? {
      athletes: new Set(),
      coaches: new Set(),
      directors: new Set(),
    };
    row.directors.add(assignment.directorUserId);
    sportRows.set(assignment.sport.name, row);
  }

  return (
    <AdminShell
      title={organization.name}
      description="Organization health, sports, people, and training."
      action={
        <Badge variant={organization.isActive ? "secondary" : "outline"}>
          {organization.isActive ? "Active" : "Inactive"}
        </Badge>
      }
    >
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/admin/organizations">← Back to organizations</Link>}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Stat label="Athletes" value={athleteIds.size} icon={Users} />
        <Stat label="Active · 30d" value={activeAthletes} icon={Activity} />
        <Stat label="Coaches" value={coaches.size} icon={Users} />
        <Stat label="Directors" value={directors.size} icon={ShieldCheck} />
        <Stat label="Workouts · 30d" value={workouts} icon={Dumbbell} />
        <Stat label="Videos · 30d" value={videos} icon={Film} />
        <Stat label="Programs active" value={activePrograms} icon={Building2} />
        <Stat label="Progress · 30d" value={prs} icon={Trophy} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-xl font-bold">Organization sports</h2>
            <p className="mt-1 text-sm text-slate-500">
              Participation from active memberships and Director assignments.
            </p>
            {sportRows.size === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-slate-500">
                No sports are active in this organization yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[...sportRows.entries()].map(([sport, row]) => (
                  <Link
                    key={sport}
                    href={`/admin/sports?search=${encodeURIComponent(sport)}`}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-brand/60"
                  >
                    <div className="flex justify-between">
                      <Volleyball className="size-5 text-brand" />
                      <Arrow />
                    </div>
                    <p className="font-heading mt-3 text-lg font-bold">{sport}</p>
                    <p className="text-sm text-slate-600">
                      {row.athletes.size} athletes · {row.coaches.size} coaches ·{" "}
                      {row.directors.size} directors
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-xl font-bold">Directors</h2>
            <div className="mt-4 space-y-2">
              {organization.directorAssignments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No Director sport assignments for this organization.
                </p>
              ) : (
                organization.directorAssignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/admin/directors/${assignment.directorUserId}`}
                    className="flex items-center justify-between rounded-xl border p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {assignment.directorUser.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {assignment.sport.name}
                      </p>
                    </div>
                    <Arrow />
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-xl font-bold">Users</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {organization.memberships.map((membership) => (
                    <tr key={membership.id} className="border-t">
                      <td className="p-3">
                        <Link
                          href={`/admin/users/${membership.userId}`}
                          className="font-semibold hover:text-brand"
                        >
                          {membership.user.name}
                        </Link>
                      </td>
                      <td className="p-3">{membership.role}</td>
                      <td className="p-3 text-slate-600">
                        {membership.user.email}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={membership.user.isActive ? "secondary" : "outline"}
                        >
                          {membership.user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-lg font-bold">Organization controls</h2>
            <form
              action={updateOrganizationAction.bind(null, organization.id)}
              className="mt-4 space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={organization.name} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="primaryColor">Primary color</Label>
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  defaultValue={organization.primaryColor ?? ""}
                />
              </div>
              <Button type="submit" variant="outline" className="w-full">
                Save organization
              </Button>
            </form>
            <form
              action={setOrganizationActiveAction.bind(
                null,
                organization.id,
                !organization.isActive,
              )}
              className="mt-3"
            >
              <Button
                type="submit"
                variant={organization.isActive ? "outline" : "default"}
                className="w-full"
              >
                {organization.isActive ? "Deactivate" : "Activate"} organization
              </Button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-lg font-bold">Content activity</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Course item completions</dt>
                <dd className="font-bold">{courseCompletions}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Metric entries · 30 days</dt>
                <dd className="font-bold">{prs}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}

function Arrow() {
  return <span className="text-brand">→</span>;
}
