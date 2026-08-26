import Link from "next/link";
import { notFound } from "next/navigation";

import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { formatAgeBandLabel, formatCourseItemType } from "@/lib/courses";
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
      </div>

      {course.items.length === 0 ? (
        <p className="text-sm text-slate-400">This course has no drills yet.</p>
      ) : (
        <ol className="space-y-4">
          {course.items.map((item) => (
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
              {item.videoUrl ? (
                <InstructionVideoPlayer src={item.videoUrl} title={item.title} />
              ) : null}
            </li>
          ))}
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
