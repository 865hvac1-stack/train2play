import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Trash2 } from "lucide-react";

import { deleteAthleteAction } from "@/app/(dashboard)/athletes/actions";
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
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

function formatDate(date: Date | null) {
  if (!date) return "Not provided";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const athlete = await prisma.athlete.findFirst({
    where: { id, coachId: user.id },
  });

  if (!athlete) {
    notFound();
  }

  return (
    <DashboardShell
      title={`${athlete.firstName} ${athlete.lastName}`}
      description="Athlete profile"
      action={
        <Button variant="outline" render={<Link href="/athletes">Back to roster</Link>} />
      }
    >
      <div className="mx-auto grid max-w-4xl gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{athlete.sport}</Badge>
              {athlete.position ? (
                <Badge variant="outline">{athlete.position}</Badge>
              ) : null}
            </div>
            <CardTitle className="text-2xl">
              {athlete.firstName} {athlete.lastName}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Born {formatDate(athlete.dateOfBirth)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {athlete.notes || "No notes added yet."}
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">
                Training history coming soon
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Workout logs, performance metrics, and season progress will appear
                here in a future update.
              </p>
            </div>

            <form action={deleteAthleteAction.bind(null, athlete.id)}>
              <Button type="submit" variant="destructive">
                <Trash2 className="h-4 w-4" />
                Remove athlete
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
