import Link from "next/link";

import { CourseForm } from "@/components/course-forms";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewCoursePage() {
  return (
    <DashboardShell
      title="New course"
      description="Create a sport library you can fill with drills, tips, and videos."
      action={
        <Button variant="outline" nativeButton={false} render={<Link href="/courses">Back</Link>} />
      }
    >
      <Card className="mx-auto w-full max-w-2xl border-brand/15 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Course details</CardTitle>
          <CardDescription>
            After you create it, add drills one by one — or import Train2Play starters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
