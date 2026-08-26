import Link from "next/link";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { formatAgeBandLabel } from "@/lib/courses";
import { listPlatformCoursesForSports } from "@/lib/sport-library";

export default async function AthleteLibraryPage() {
  const ctx = await requireAthleteContext();
  const courses = await listPlatformCoursesForSports({
    sports: ctx.sports,
    audience: "athletes",
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Library
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Courses for your sports
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {ctx.sports.join(" · ") || ctx.sport}. Change sports on your profile
          anytime.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
          No Train2Play courses are published for your sports yet. Add another
          sport on your profile if you play more than one.
        </p>
      ) : (
        <ul className="space-y-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/athlete/library/${course.id}`}
                className="block rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                <p className="text-xs font-bold tracking-wide text-brand uppercase">
                  {course.sport} · {formatAgeBandLabel(course.ageBand)}
                </p>
                <p className="mt-1 font-heading text-xl font-bold">
                  {course.title}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {course._count.items} drills / videos
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
