import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddLibraryCourseButton } from "@/components/library-sharing-form";
import { formatAgeBandLabel } from "@/lib/courses";
import { SPORTS } from "@/lib/athletes";
import { prisma } from "@/lib/db";
import { isLibraryEditor } from "@/lib/roles";
import { requireCoach } from "@/lib/session";
import { COURSE_ORIGIN, listPlatformCoursesForSports } from "@/lib/sport-library";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const user = await requireCoach();
  const admin = isLibraryEditor(user.role);
  const { sport: sportFilter } = await searchParams;

  const ownedLibrary = admin
    ? await prisma.course.findMany({
        where: {
          origin: COURSE_ORIGIN.PLATFORM,
          ...(sportFilter ? { sport: sportFilter } : {}),
        },
        include: { _count: { select: { items: true } } },
        orderBy: [{ sport: "asc" }, { updatedAt: "desc" }],
      })
    : [];

  const published = await listPlatformCoursesForSports({
    sports: sportFilter ? [sportFilter] : [...SPORTS],
    audience: "coaches",
  });

  const alreadyCopied = await prisma.course.findMany({
    where: {
      coachId: user.id,
      sourceCourseId: { not: null },
    },
    select: { sourceCourseId: true },
  });
  const copiedIds = new Set(alreadyCopied.map((row) => row.sourceCourseId));

  return (
    <DashboardShell
      title="Sport library"
      description="Train2Play master courses by sport. Publish to coaches and athletes, or add a course to your own library."
      action={
        admin ? (
          <Button
            nativeButton={false}
            render={
              <Link href="/library/new">
                <Plus className="size-4" />
                New library course
              </Link>
            }
          />
        ) : undefined
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!sportFilter ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/library">All sports</Link>}
        />
        {SPORTS.map((sport) => (
          <Button
            key={sport}
            size="sm"
            variant={sportFilter === sport ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={`/library?sport=${encodeURIComponent(sport)}`}>
                {sport}
              </Link>
            }
          />
        ))}
      </div>

      {admin ? (
        <section className="mb-8 space-y-3">
          <h2 className="font-heading text-xl font-bold">Master catalog</h2>
          <p className="text-sm text-slate-600">
            Upload videos and drills here, then publish each course to coaches
            and/or athletes in that sport.
          </p>
          {ownedLibrary.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <BookOpen className="text-muted-foreground mx-auto mb-3 size-10" />
                <p className="font-semibold">No master courses yet</p>
                <Button
                  className="mt-4"
                  nativeButton={false}
                  render={<Link href="/library/new">Create the first one</Link>}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ownedLibrary.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="h-full border-brand/20 bg-white/90 hover:border-brand/40">
                    <CardHeader>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{course.sport}</Badge>
                        {course.shareWithCoaches ? (
                          <Badge>Coaches</Badge>
                        ) : null}
                        {course.shareWithAthletes ? (
                          <Badge variant="outline">Athletes</Badge>
                        ) : null}
                      </div>
                      <CardTitle className="font-heading text-xl">
                        {course.title}
                      </CardTitle>
                      <CardDescription>
                        {course._count.items} items ·{" "}
                        {formatAgeBandLabel(course.ageBand)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold">
          Published to coaches
        </h2>
        {published.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No Train2Play courses are published to coaches
            {sportFilter ? ` for ${sportFilter}` : ""} yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {published.map((course) => (
              <Card key={course.id} className="border-brand/15 bg-white/90">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">
                    {course.sport}
                  </Badge>
                  <CardTitle className="font-heading text-xl">
                    {course.title}
                  </CardTitle>
                  <CardDescription>
                    {course._count.items} drills / videos
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/courses/${course.id}`}>Open</Link>}
                  />
                  {copiedIds.has(course.id) ? (
                    <p className="text-sm font-medium text-primary">
                      Already in your courses
                    </p>
                  ) : (
                    <AddLibraryCourseButton courseId={course.id} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
