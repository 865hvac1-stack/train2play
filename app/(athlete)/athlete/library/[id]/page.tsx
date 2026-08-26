import Link from "next/link";
import { notFound } from "next/navigation";

import { AthleteCourseProgressControls } from "@/components/athlete-course-progress-controls";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { formatAgeBandLabel, formatCourseItemType } from "@/lib/courses";
import { prisma } from "@/lib/db";
import { getSharedPlatformCourse } from "@/lib/sport-library";

export default async function AthleteLibraryCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { id } = await params;
  const course = await getSharedPlatformCourse({
    courseId: id,
    sports: ctx.sports,
    audience: "athletes",
  });
  if (!course) notFound();
  const progressRows = await prisma.courseItemProgress.findMany({
    where: {
      athleteProfileId: ctx.profileId,
      courseItemId: { in: course.items.map((item) => item.id) },
    },
  });
  const progressByItem = new Map(
    progressRows.map((progress) => [progress.courseItemId, progress]),
  );
  const completedCount = progressRows.filter(
    (progress) => progress.completedAt,
  ).length;
  const completionPercent =
    course.items.length > 0
      ? Math.round((completedCount / course.items.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          {course.sport} · {formatAgeBandLabel(course.ageBand)}
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {course.title}
        </h1>
        {course.description ? (
          <p className="mt-2 text-sm text-slate-400">{course.description}</p>
        ) : null}
        {course.items.length > 0 ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Course progress</span>
              <span>
                {completedCount}/{course.items.length} · {completionPercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {course.items.length === 0 ? (
        <p className="text-sm text-slate-400">This course has no drills yet.</p>
      ) : (
        <ol className="space-y-4">
          {course.items.map((item) => {
            const progress = progressByItem.get(item.id);
            return (
              <li
                key={item.id}
                className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                <p className="text-xs font-bold tracking-wide text-brand uppercase">
                  {formatCourseItemType(item.type)}
                </p>
                <h2 className="font-heading text-xl font-bold">{item.title}</h2>
                {item.focus ? (
                  <p className="text-sm text-brand">{item.focus}</p>
                ) : null}
                {item.body ? (
                  <p className="whitespace-pre-wrap text-sm text-slate-300">
                    {item.body}
                  </p>
                ) : null}
                {item.coachingCue ? (
                  <p className="text-sm text-slate-200">
                    Cue: {item.coachingCue}
                  </p>
                ) : null}
                <AthleteCourseProgressControls
                  itemId={item.id}
                  title={item.title}
                  videoUrl={item.videoUrl}
                  initiallyViewed={Boolean(progress?.viewedAt)}
                  initiallyCompleted={Boolean(progress?.completedAt)}
                />
              </li>
            );
          })}
        </ol>
      )}

      <Link
        href="/athlete/library"
        className="block text-center text-sm text-slate-400 underline-offset-2 hover:underline"
      >
        Back to library
      </Link>
    </div>
  );
}
