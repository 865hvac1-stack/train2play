import { BookOpen, Dumbbell, Film, Plus } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

const TYPES = ["ALL", "DRILLS", "WORKOUTS", "PROGRAMS", "COURSES", "VIDEOS"] as const;

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sport?: string; status?: string }>;
}) {
  const query = await searchParams;
  const type = TYPES.includes(query.type as (typeof TYPES)[number])
    ? (query.type as (typeof TYPES)[number])
    : "ALL";
  const sport = query.sport;

  const [courses, drills, plans, videos, sports] = await Promise.all([
    type === "ALL" || type === "COURSES"
      ? prisma.course.findMany({
          where: {
            ...(sport ? { sport } : {}),
            ...(query.status === "published"
              ? { published: true }
              : query.status === "draft"
                ? { published: false }
                : {}),
          },
          include: {
            coach: { select: { name: true, role: true } },
            items: {
              select: {
                id: true,
                athleteProgress: {
                  select: {
                    athleteProfileId: true,
                    viewedAt: true,
                    completedAt: true,
                  },
                },
              },
            },
            _count: { select: { items: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    type === "ALL" || type === "DRILLS"
      ? prisma.catalogDrill.findMany({
          where: {
            ...(sport ? { sport } : {}),
            ...(query.status === "published"
              ? { isActive: true }
              : query.status === "draft"
                ? { isActive: false }
                : {}),
          },
          include: {
            pushes: {
              select: {
                athleteProfileId: true,
                pushedByUserId: true,
                source: true,
                firstViewedAt: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    type === "PROGRAMS" || type === "WORKOUTS"
      ? prisma.trainingPlan.findMany({
          include: {
            coach: { select: { name: true, role: true } },
            athlete: { select: { id: true } },
            workouts: {
              select: {
                id: true,
                title: true,
                completed: true,
                sessions: { select: { status: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    type === "VIDEOS"
      ? prisma.trainingVideo.findMany({
          where: sport
            ? { athlete: { sport: { equals: sport, mode: "insensitive" } } }
            : {},
          include: {
            coach: { select: { name: true, role: true } },
            videoReviews: { select: { status: true, reviewedAt: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.platformSport.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const courseRows = courses.map((course) => {
    const progress = course.items.flatMap((item) => item.athleteProgress);
    const started = new Set(
      progress
        .filter((row) => row.viewedAt)
        .map((row) => row.athleteProfileId),
    ).size;
    const completed = new Set(
      progress
        .filter((row) => row.completedAt)
        .map((row) => row.athleteProfileId),
    ).size;
    return {
      id: course.id,
      type: "Course",
      title: course.title,
      creator: course.coach.name,
      source: course.origin === "PLATFORM" ? "TRAIN2PLAY" : "COACH",
      sport: course.sport,
      status: course.published ? "Published" : "Draft",
      visibility: [
        course.shareWithCoaches ? "Coaches" : null,
        course.shareWithAthletes ? "Athletes" : null,
      ]
        .filter(Boolean)
        .join(" + ") || "Private",
      assigned: null,
      started,
      completed,
      rate: started ? Math.round((completed / started) * 100) : 0,
      href: `/courses/${course.id}`,
    };
  });
  const drillRows = drills.map((drill) => {
    const sent = new Set(drill.pushes.map((row) => row.athleteProfileId)).size;
    const viewed = new Set(
      drill.pushes
        .filter((row) => row.firstViewedAt)
        .map((row) => row.athleteProfileId),
    ).size;
    const coaches = new Set(
      drill.pushes
        .filter((row) => row.source === "COACH")
        .map((row) => row.pushedByUserId),
    ).size;
    return {
      id: drill.id,
      type: "Drill",
      title: drill.title,
      creator: drill.updatedById ? "Director / content creator" : "Train2Play",
      source: drill.updatedById ? "DIRECTOR" : "TRAIN2PLAY",
      sport: drill.sport,
      status: drill.isActive ? "Published" : "Inactive",
      visibility: [
        drill.shareWithCoaches ? "Coaches" : null,
        drill.shareWithAthletes ? "Athletes" : null,
      ]
        .filter(Boolean)
        .join(" + ") || "Private",
      assigned: sent,
      started: viewed,
      completed: null,
      rate: sent ? Math.round((viewed / sent) * 100) : 0,
      coaches,
      href: `/trainer/drills/${drill.id}`,
    };
  });

  const rows = [...courseRows, ...drillRows];

  return (
    <AdminShell
      title="Content"
      description="The Train2Play master content control center."
      action={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link href="/trainer/drills">
                <Plus className="size-4" />
                New drill
              </Link>
            }
          />
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link href="/library/new">
                <Plus className="size-4" />
                Official course
              </Link>
            }
          />
        </div>
      }
    >
      <div className="flex flex-wrap gap-2">
        {TYPES.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={type === value ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={`/admin/content${value === "ALL" ? "" : `?type=${value}`}`}>
                {value[0] + value.slice(1).toLowerCase()}
              </Link>
            }
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!sport ? "secondary" : "ghost"}
          nativeButton={false}
          render={<Link href={`/admin/content?type=${type}`}>All sports</Link>}
        />
        {sports.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={sport === item.name ? "secondary" : "ghost"}
            nativeButton={false}
            render={
              <Link
                href={`/admin/content?type=${type}&sport=${encodeURIComponent(item.name)}`}
              >
                {item.name}
              </Link>
            }
          />
        ))}
      </div>

      {(type === "ALL" || type === "COURSES" || type === "DRILLS") && (
        <section className="mt-5 overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-4">
            <h2 className="font-heading text-lg font-bold">
              Drills & courses
            </h2>
            <p className="text-xs text-slate-500">
              Reach and completion use actual athlete progress and drill sends.
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="p-8 text-sm text-slate-500">
              No content matches this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Content</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Sport</th>
                    <th className="p-3">Visibility</th>
                    <th className="p-3">Sent / assigned</th>
                    <th className="p-3">Started / opened</th>
                    <th className="p-3">Completed</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.type}-${row.id}`} className="border-t">
                      <td className="p-3">
                        <Link
                          href={row.href}
                          className="font-semibold hover:text-brand"
                        >
                          {row.title}
                        </Link>
                        <span className="block text-xs text-slate-500">
                          {row.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{row.source}</Badge>
                        <span className="mt-1 block text-xs text-slate-500">
                          {row.creator}
                        </span>
                      </td>
                      <td className="p-3">{row.sport}</td>
                      <td className="p-3">{row.visibility}</td>
                      <td className="p-3">{row.assigned ?? "—"}</td>
                      <td className="p-3">{row.started}</td>
                      <td className="p-3">{row.completed ?? "—"}</td>
                      <td className="p-3">{row.rate}%</td>
                      <td className="p-3">
                        <Badge variant="secondary">{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {(type === "PROGRAMS" || type === "WORKOUTS") && (
        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.flatMap((plan) =>
            type === "PROGRAMS"
              ? [
                  <Link
                    key={plan.id}
                    href={`/training/${plan.id}`}
                    className="rounded-2xl border bg-white p-4 hover:border-brand/60"
                  >
                    <Dumbbell className="size-5 text-brand" />
                    <p className="mt-3 font-semibold">{plan.title}</p>
                    <p className="text-xs text-slate-500">
                      {plan.coach.name} · {plan.workouts.length} workouts ·{" "}
                      {plan.athlete ? "Assigned" : "Unassigned"}
                    </p>
                  </Link>,
                ]
              : plan.workouts.map((workout) => {
                  const completed = workout.sessions.filter(
                    (session) => session.status === "COMPLETED",
                  ).length;
                  return (
                    <Link
                      key={workout.id}
                      href={`/training/${plan.id}`}
                      className="rounded-2xl border bg-white p-4 hover:border-brand/60"
                    >
                      <Dumbbell className="size-5 text-brand" />
                      <p className="mt-3 font-semibold">{workout.title}</p>
                      <p className="text-xs text-slate-500">
                        {plan.title} · {completed} completed sessions
                      </p>
                    </Link>
                  );
                }),
          )}
        </section>
      )}

      {type === "VIDEOS" && (
        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/videos/${video.id}`}
              className="rounded-2xl border bg-white p-4 hover:border-brand/60"
            >
              <Film className="size-5 text-brand" />
              <p className="mt-3 font-semibold">{video.title}</p>
              <p className="text-xs text-slate-500">
                {video.coach.name} · {video.videoReviews.length} review records ·{" "}
                {
                  video.videoReviews.filter((review) => review.status === "REVIEWED")
                    .length
                }{" "}
                completed
              </p>
            </Link>
          ))}
        </section>
      )}

      <div className="mt-6 rounded-2xl border border-dashed bg-white p-5">
        <BookOpen className="size-5 text-brand" />
        <p className="mt-2 font-semibold">Train2Play official content</p>
        <p className="text-sm text-slate-500">
          Content with PLATFORM origin is the official catalog. Director and
          coach ownership remain visible rather than being overwritten.
        </p>
      </div>
    </AdminShell>
  );
}
