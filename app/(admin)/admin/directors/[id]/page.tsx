import { Activity, BookOpen, Building2, Dumbbell, ShieldCheck, Users, Volleyball } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  assignDirectorSportAction,
  removeDirectorSportAction,
  setUserActiveAction,
} from "@/app/(admin)/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countAthletesForSport, countCoachesForSport } from "@/lib/admin-analytics";
import { prisma } from "@/lib/db";

export default async function DirectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [director, sports, organizations, drills] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: "TRAINER" },
      include: {
        organizationMemberships: { include: { organization: true } },
        directorSportAssignments: {
          include: { sport: true, organization: true, assignedBy: true },
          orderBy: { createdAt: "desc" },
        },
        courses: {
          include: { _count: { select: { items: true } } },
          orderBy: { updatedAt: "desc" },
          take: 20,
        },
        trainingPlans: {
          include: { athlete: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    prisma.platformSport.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.catalogDrill.findMany({
      where: { updatedById: id },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);
  if (!director) notFound();

  const activeAssignments = director.directorSportAssignments.filter(
    (assignment) => assignment.isActive,
  );
  const sportNames = [...new Set(activeAssignments.map((row) => row.sport.name))];
  const [athleteCounts, coachCounts] = await Promise.all([
    Promise.all(sportNames.map((sport) => countAthletesForSport(sport))),
    Promise.all(sportNames.map((sport) => countCoachesForSport(sport))),
  ]);
  const athletes = athleteCounts.reduce((sum, count) => sum + count, 0);
  const coaches = coachCounts.reduce((sum, count) => sum + count, 0);

  return (
    <AdminShell
      title={director.name}
      description={`Director · ${director.email}`}
      action={
        <Badge variant={director.isActive ? "secondary" : "outline"}>
          {director.isActive ? "Active" : "Inactive"}
        </Badge>
      }
    >
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/admin/directors">← Back to Directors</Link>}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Authorized sports", sportNames.length, Volleyball],
          ["Athletes under programs", athletes, Users],
          ["Connected coaches", coaches, Users],
          ["Content published", director.courses.length + drills.length, BookOpen],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-4">
            <Icon className="size-4 text-brand" />
            <p className="font-heading mt-3 text-3xl font-bold">{String(value)}</p>
            <p className="text-xs text-slate-500">{String(label)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-heading text-xl font-bold">Sport access</h2>
            {activeAssignments.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed p-5 text-sm text-slate-500">
                No sport access assigned. This Director can sign in but has no
                authorized program scope yet.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {activeAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div>
                      <p className="font-semibold">{assignment.sport.name}</p>
                      <p className="text-xs text-slate-500">
                        {assignment.organization?.name ?? "Platform-wide"}
                        {assignment.assignedBy
                          ? ` · assigned by ${assignment.assignedBy.name}`
                          : ""}
                      </p>
                    </div>
                    <form
                      action={removeDirectorSportAction.bind(
                        null,
                        assignment.id,
                        director.id,
                      )}
                    >
                      <Button type="submit" size="sm" variant="ghost">
                        Remove
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
              <BookOpen className="size-5 text-brand" />
              Published content
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {director.courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="rounded-xl border p-3 hover:border-brand/60"
                >
                  <div className="flex gap-2">
                    <Badge variant="outline">{course.origin}</Badge>
                    <Badge variant="outline">{course.sport}</Badge>
                  </div>
                  <p className="mt-2 font-semibold">{course.title}</p>
                  <p className="text-xs text-slate-500">
                    {course._count.items} items ·{" "}
                    {course.published ? "Published" : "Draft"}
                  </p>
                </Link>
              ))}
              {drills.map((drill) => (
                <Link
                  key={drill.id}
                  href={`/trainer/drills/${drill.id}`}
                  className="rounded-xl border p-3 hover:border-brand/60"
                >
                  <div className="flex gap-2">
                    <Badge variant="outline">Suggested drill</Badge>
                    <Badge variant="outline">{drill.sport}</Badge>
                  </div>
                  <p className="mt-2 font-semibold">{drill.title}</p>
                  <p className="text-xs text-slate-500">
                    Updated {drill.updatedAt.toLocaleDateString()}
                  </p>
                </Link>
              ))}
              {director.courses.length === 0 && drills.length === 0 ? (
                <p className="text-sm text-slate-500">No content published.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
              <Dumbbell className="size-5 text-brand" />
              Recent training activity
            </h2>
            <div className="mt-4 space-y-2">
              {director.trainingPlans.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No training plans created by this Director account.
                </p>
              ) : (
                director.trainingPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/training/${plan.id}`}
                    className="block rounded-xl border p-3 hover:border-brand/60"
                  >
                    <p className="font-semibold">{plan.title}</p>
                    <p className="text-xs text-slate-500">
                      {plan.athlete
                        ? `${plan.athlete.firstName} ${plan.athlete.lastName}`
                        : "Team plan"}{" "}
                      · {plan.createdAt.toLocaleDateString()}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-heading text-lg font-bold">Assign sport access</h2>
            <form
              action={assignDirectorSportAction.bind(null, director.id)}
              className="mt-4 space-y-3"
            >
              <select
                name="sportId"
                required
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="">Choose sport</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
              <select
                name="organizationId"
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="">Platform-wide</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <Button type="submit" className="w-full">
                Assign access
              </Button>
            </form>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-heading text-lg font-bold">Director information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Last active</dt>
                <dd className="font-semibold">
                  {director.lastActiveAt?.toLocaleString() ?? "Not recorded"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Organizations</dt>
                <dd className="font-semibold">
                  {director.organizationMemberships
                    .map((row) => row.organization.name)
                    .join(", ") || "None"}
                </dd>
              </div>
            </dl>
            <form
              action={setUserActiveAction.bind(null, director.id, !director.isActive)}
              className="mt-4"
            >
              <Button
                type="submit"
                variant={director.isActive ? "outline" : "default"}
                className="w-full"
              >
                {director.isActive ? "Deactivate Director" : "Activate Director"}
              </Button>
            </form>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
              <Activity className="size-4 text-brand" />
              Director actions
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Content updates and training assignments are listed above. Future
              announcements will plug into this same detail page.
            </p>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
