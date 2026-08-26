import { BookOpen, Building2, Dumbbell, Film, ShieldCheck, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setPlatformSportActiveAction } from "@/app/(admin)/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  countAthletesForSport,
  countCoachesForSport,
  countOrganizationsForSport,
} from "@/lib/admin-analytics";
import { prisma } from "@/lib/db";

export default async function AdminSportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sport = await prisma.platformSport.findUnique({
    where: { id },
    include: {
      directorAssignments: {
        where: { isActive: true },
        include: { directorUser: true, organization: true },
      },
    },
  });
  if (!sport) notFound();
  const since = new Date(Date.now() - 30 * 86400000);
  const [
    athletes,
    activeAthletes,
    coaches,
    organizations,
    workouts,
    videos,
    prs,
    courses,
    drills,
  ] = await Promise.all([
    countAthletesForSport(sport.name),
    countAthletesForSport(sport.name, since),
    countCoachesForSport(sport.name),
    countOrganizationsForSport(sport.name),
    prisma.workoutSession.count({
      where: {
        status: "COMPLETED",
        completedAt: { gte: since },
        athlete: { sport: { equals: sport.name, mode: "insensitive" } },
      },
    }),
    prisma.videoReview.count({
      where: {
        sport: { equals: sport.name, mode: "insensitive" },
        submittedAt: { gte: since },
      },
    }),
    prisma.exerciseResult.count({
      where: {
        isPersonalRecord: true,
        completedAt: { gte: since },
        session: {
          athlete: { sport: { equals: sport.name, mode: "insensitive" } },
        },
      },
    }),
    prisma.course.findMany({
      where: { sport: { equals: sport.name, mode: "insensitive" } },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.catalogDrill.findMany({
      where: {
        sport: { equals: sport.name, mode: "insensitive" },
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);
  const activeRate = athletes ? Math.round((activeAthletes / athletes) * 100) : 0;

  return (
    <AdminShell
      title={sport.name}
      description={`${sport.name} across every Train2Play organization.`}
      action={
        <Badge variant={sport.isActive ? "secondary" : "outline"}>
          {sport.isActive ? "Active" : "Inactive"}
        </Badge>
      }
    >
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/admin/sports">← Back to sports</Link>}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Athletes", athletes, Users],
          ["Active athletes", `${activeRate}%`, Users],
          ["Coaches", coaches, Users],
          ["Directors", sport.directorAssignments.length, ShieldCheck],
          ["Organizations", organizations, Building2],
          ["Workouts · 30d", workouts, Dumbbell],
          ["Videos · 30d", videos, Film],
          ["PRs · 30d", prs, Trophy],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-4">
            <Icon className="size-4 text-brand" />
            <p className="font-heading mt-3 text-3xl font-bold">{String(value)}</p>
            <p className="text-xs text-slate-500">{String(label)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <ShieldCheck className="size-5 text-brand" />
            Directors
          </h2>
          <div className="mt-4 space-y-2">
            {sport.directorAssignments.length === 0 ? (
              <p className="text-sm text-slate-500">No Directors assigned.</p>
            ) : (
              sport.directorAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/admin/directors/${assignment.directorUserId}`}
                  className="block rounded-xl border p-3 hover:border-brand/60"
                >
                  <p className="font-semibold">{assignment.directorUser.name}</p>
                  <p className="text-xs text-slate-500">
                    {assignment.organization?.name ?? "Platform-wide"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <BookOpen className="size-5 text-brand" />
            Programs & courses
          </h2>
          <div className="mt-4 space-y-2">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="block rounded-xl border p-3 hover:border-brand/60"
              >
                <div className="flex gap-2">
                  <Badge variant="outline">{course.origin}</Badge>
                  <Badge variant="outline">
                    {course.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="mt-2 font-semibold">{course.title}</p>
                <p className="text-xs text-slate-500">
                  {course._count.items} items
                </p>
              </Link>
            ))}
            {courses.length === 0 ? (
              <p className="text-sm text-slate-500">No courses for this sport.</p>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <Dumbbell className="size-5 text-brand" />
            Suggested drills
          </h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {drills.map((drill) => (
              <Link
                key={drill.id}
                href={`/trainer/drills/${drill.id}`}
                className="rounded-xl border p-3 hover:border-brand/60"
              >
                <p className="font-semibold">{drill.title}</p>
                <p className="text-xs text-slate-500">
                  {drill.ageBand} · {drill.durationMin} min
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <form
        action={setPlatformSportActiveAction.bind(null, sport.id, !sport.isActive)}
        className="mt-6"
      >
        <Button type="submit" variant="outline">
          {sport.isActive ? "Deactivate sport" : "Activate sport"}
        </Button>
      </form>
    </AdminShell>
  );
}
