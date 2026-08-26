import Link from "next/link";

import { CourseForm } from "@/components/course-forms";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireLibraryEditor } from "@/lib/session";

export default async function NewLibraryCoursePage() {
  await requireLibraryEditor();

  return (
    <DashboardShell
      title="New library course"
      description="This lives in the Train2Play master catalog. After you add videos, publish it to coaches and athletes in that sport."
      action={
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/library">Back to library</Link>}
        />
      }
    >
      <div className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4">
        <CourseForm mode="create" library />
      </div>
    </DashboardShell>
  );
}
