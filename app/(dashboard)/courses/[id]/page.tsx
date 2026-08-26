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
import { LibrarySharingForm, AddLibraryCourseButton } from "@/components/library-sharing-form";
import {
  formatAgeBandLabel,
  formatCourseItemType,
} from "@/lib/courses";
import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/roles";
import { requireCoach } from "@/lib/session";
import { COURSE_ORIGIN } from "@/lib/sport-library";

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; item?: string }>;
}) {
  const user = await requireCoach();
  const admin = isPlatformAdmin(user.role);
  const { id } = await params;
  const { edit, item: editItemId } = await searchParams;

  const includeItems = {
    items: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
  };
  const owned = await prisma.course.findFirst({
    where: { id, coachId: user.id },
    include: includeItems,
  });
  const platform = owned
    ? null
    : await prisma.course.findFirst({
        where: {
          id,
          origin: COURSE_ORIGIN.PLATFORM,
          ...(admin ? {} : { published: true, shareWithCoaches: true }),
        },
        include: includeItems,
      });

  const course = owned ?? platform;
  if (!course) {
    notFound();
  }
  const canEdit =
    Boolean(owned) ||
    (admin && course.origin === COURSE_ORIGIN.PLATFORM);
  const isPlatform = course.origin === COURSE_ORIGIN.PLATFORM;
  const editingCourse = canEdit && edit === "1";
  const editingItem = editItemId
    ? course.items.find((i) => i.id === editItemId)
    : null;

  return (
    <DashboardShell
      title={course.title}
      description={`${course.sport} · ${formatAgeBandLabel(course.ageBand)}`}
      action={
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
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
          ) : (
            <AddLibraryCourseButton courseId={course.id} />
          )}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={isPlatform ? "/library" : "/courses"}>Back</Link>}
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
                    {isPlatform ? <Badge>Train2Play library</Badge> : null}
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
                {canEdit ? (
                  <>
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
                  </>
                ) : (
                  <AddLibraryCourseButton courseId={course.id} />
                )}
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
                          {canEdit ? (
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
                          ) : null}
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
          {admin && isPlatform ? (
            <Card className="border-brand/20 bg-white/90">
              <CardHeader>
                <CardTitle className="font-heading">Publishing</CardTitle>
              </CardHeader>
              <CardContent>
                <LibrarySharingForm
                  courseId={course.id}
                  shareWithCoaches={course.shareWithCoaches}
                  shareWithAthletes={course.shareWithAthletes}
                />
              </CardContent>
            </Card>
          ) : null}
          {canEdit ? (
          <Card className="border-brand/20 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading">Add drill / tip</CardTitle>
              <CardDescription>
                Upload a teaching video or write a drill. Then publish this
                course to coaches and athletes in {course.sport}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseItemForm courseId={course.id} />
            </CardContent>
          </Card>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
