import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, Pencil, Trash2 } from "lucide-react";

import {
  deleteCourseAction,
  deleteCourseItemAction,
  importStarterDrillsAction,
} from "@/app/(dashboard)/courses/actions";
import { CourseForm, CourseItemForm } from "@/components/course-forms";
import { DashboardShell } from "@/components/dashboard-shell";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatAgeBandLabel,
  formatCourseItemType,
} from "@/lib/courses";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; item?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { edit, item: editItemId } = await searchParams;

  const course = await prisma.course.findFirst({
    where: { id, coachId: user.id },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!course) {
    notFound();
  }

  const editingCourse = edit === "1";
  const editingItem = editItemId
    ? course.items.find((i) => i.id === editItemId)
    : null;

  return (
    <DashboardShell
      title={course.title}
      description={`${course.sport} · ${formatAgeBandLabel(course.ageBand)}`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={editingCourse ? `/courses/${course.id}` : `/courses/${course.id}?edit=1`}>
                <Pencil className="size-3.5" />
                {editingCourse ? "Done" : "Edit course"}
              </Link>
            }
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/courses">All courses</Link>}
          />
        </div>
      }
    >
      <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {editingCourse ? (
            <Card className="border-brand/20 bg-white/90">
              <CardHeader>
                <CardTitle className="font-heading">Edit course</CardTitle>
              </CardHeader>
              <CardContent>
                <CourseForm
                  mode="edit"
                  courseId={course.id}
                  defaults={{
                    title: course.title,
                    sport: course.sport,
                    description: course.description,
                    ageBand: course.ageBand,
                    published: course.published,
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-brand/15 bg-white/90">
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{course.sport}</Badge>
                  <Badge variant="outline">{formatAgeBandLabel(course.ageBand)}</Badge>
                  {!course.published ? <Badge variant="outline">Draft</Badge> : null}
                </div>
                <CardTitle className="font-heading text-2xl">{course.title}</CardTitle>
                {course.description ? (
                  <CardDescription className="text-base">
                    {course.description}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <form action={importStarterDrillsAction.bind(null, course.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Import Train2Play starter drills
                  </Button>
                </form>
                <form action={deleteCourseAction.bind(null, course.id)}>
                  <Button type="submit" variant="destructive" size="sm">
                    <Trash2 className="size-3.5" />
                    Delete course
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-brand/15 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                Library ({course.items.length})
              </CardTitle>
              <CardDescription>
                Drills, tips, and videos in this course.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.items.length > 0 ? (
                course.items.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-3 rounded-xl border border-slate-200 p-4"
                  >
                    {editingItem?.id === item.id ? (
                      <CourseItemForm
                        courseId={course.id}
                        mode="edit"
                        itemId={item.id}
                        defaults={{
                          type: item.type,
                          title: item.title,
                          body: item.body,
                          focus: item.focus,
                          coachingCue: item.coachingCue,
                          equipment: item.equipment,
                          durationMin: item.durationMin,
                          ageBand: item.ageBand,
                          videoUrl: item.videoUrl,
                        }}
                      />
                    ) : (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="mb-1 flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                {formatCourseItemType(item.type)}
                              </Badge>
                              <Badge variant="outline">
                                {formatAgeBandLabel(item.ageBand)}
                              </Badge>
                            </div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            {item.focus ? (
                              <p className="text-sm text-brand">{item.focus}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              nativeButton={false}
                              render={
                                <Link href={`/courses/${course.id}?item=${item.id}`}>
                                  Edit
                                </Link>
                              }
                            />
                            <form
                              action={deleteCourseItemAction.bind(
                                null,
                                course.id,
                                item.id,
                              )}
                            >
                              <Button type="submit" size="sm" variant="ghost">
                                Remove
                              </Button>
                            </form>
                          </div>
                        </div>
                        {item.body ? (
                          <p className="text-sm leading-relaxed text-slate-600">
                            {item.body}
                          </p>
                        ) : null}
                        {item.coachingCue ? (
                          <p className="text-sm text-slate-800">
                            <span className="font-medium">Cue: </span>
                            {item.coachingCue}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          {item.durationMin ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="size-3.5" />
                              {item.durationMin} min
                            </span>
                          ) : null}
                          {item.equipment ? <span>{item.equipment}</span> : null}
                        </div>
                        {item.videoUrl ? (
                          <InstructionVideoPlayer
                            src={item.videoUrl}
                            title="Watch"
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No items yet. Add a drill on the right, or import starter drills.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-brand/20 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading">Add drill / tip</CardTitle>
              <CardDescription>
                Build out your full sport library over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseItemForm courseId={course.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
