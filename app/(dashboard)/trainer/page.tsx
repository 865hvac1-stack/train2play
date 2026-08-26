import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireLibraryEditor } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function TrainerHomePage() {
  const user = await requireLibraryEditor();
  const [courses, drills] = await Promise.all([
    prisma.course.count({ where: { origin: "PLATFORM" } }),
    prisma.catalogDrill.count({ where: { isActive: true } }),
  ]);

  return (
    <DashboardShell
      title="Trainer desk"
      description="Build the Train2Play catalog. Coaches and athletes only see what you publish for their sport."
    >
      <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <Link
          href="/library"
          className="rounded-2xl border border-brand/20 bg-white p-5 hover:border-brand/40"
        >
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Courses
          </p>
          <h2 className="font-heading mt-1 text-2xl font-bold">Sport library</h2>
          <p className="mt-2 text-sm text-slate-600">
            Upload teaching videos, then publish to coaches and athletes by
            sport. {courses} master course{courses === 1 ? "" : "s"} so far.
          </p>
        </Link>
        <Link
          href="/trainer/drills"
          className="rounded-2xl border border-brand/20 bg-white p-5 hover:border-brand/40"
        >
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Suggestions
          </p>
          <h2 className="font-heading mt-1 text-2xl font-bold">
            Suggested drills
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Edit the drills athletes and coaches see by sport and age. {drills}{" "}
            active drill{drills === 1 ? "" : "s"}.
          </p>
        </Link>
      </div>
      <p className="mx-auto mt-6 max-w-3xl text-sm text-slate-500">
        Signed in as {user.email}. This is not the coach roster — Chase and
        other trainers stay on this desk.
      </p>
      <div className="mx-auto mt-4 max-w-3xl">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/library/new">New library course</Link>}
        />
      </div>
    </DashboardShell>
  );
}
