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
import { formatAgeBandLabel } from "@/lib/courses";
import { SPORTS } from "@/lib/athletes";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const user = await requireUser();
  const { sport: sportFilter } = await searchParams;

  const courses = await prisma.course.findMany({
    where: {
      coachId: user.id,
      ...(sportFilter ? { sport: sportFilter } : {}),
    },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: [{ sport: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <DashboardShell
      title="Courses"
      description="Build your drill and tip library by sport — add, edit, and grow over time."
      action={
        <Button
          nativeButton={false}
          render={
            <Link href="/courses/new">
              <Plus className="size-4" />
              New course
            </Link>
          }
        />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!sportFilter ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/courses">All sports</Link>}
        />
        {SPORTS.map((sport) => (
          <Button
            key={sport}
            size="sm"
            variant={sportFilter === sport ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={`/courses?sport=${encodeURIComponent(sport)}`}>
                {sport}
              </Link>
            }
          />
        ))}
      </div>

      {courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="text-muted-foreground mb-4 size-12" />
            <h2 className="font-heading text-xl font-bold">Start your library</h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm">
              Create a course for a sport, then add drills, tips, and videos. You can also import
              Train2Play starter drills after you create a course.
            </p>
            <Button
              className="mt-6"
              nativeButton={false}
              render={<Link href="/courses/new">Create first course</Link>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="min-w-0">
              <Card className="h-full border-brand/15 bg-white/90 transition-all hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{course.sport}</Badge>
                    <Badge variant="outline">
                      {formatAgeBandLabel(course.ageBand)}
                    </Badge>
                    {!course.published ? (
                      <Badge variant="outline">Draft</Badge>
                    ) : null}
                  </div>
                  <CardTitle className="font-heading text-xl">{course.title}</CardTitle>
                  {course.description ? (
                    <CardDescription className="line-clamp-2">
                      {course.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    {course._count.items} drill
                    {course._count.items === 1 ? "" : "s"} / tips
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
