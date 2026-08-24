import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddVideoUrlForm, UploadVideoForm } from "@/components/video-forms";
import { requireCoachId } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function NewVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string }>;
}) {
  const coachId = await requireCoachId();
  const { athleteId } = await searchParams;

  const athletes = await prisma.athlete.findMany({
    where: { coachId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <DashboardShell
      title="Add video"
      description="Upload from your device or link a direct MP4 for on-frame coaching notes."
      action={
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/videos">
              <ArrowLeft className="size-4" />
              Back to videos
            </Link>
          }
        />
      }
    >
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload file</CardTitle>
            <CardDescription>Best for game film and phone recordings.</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadVideoForm athletes={athletes} defaultAthleteId={athleteId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link URL</CardTitle>
            <CardDescription>Direct MP4 or WebM link (not YouTube).</CardDescription>
          </CardHeader>
          <CardContent>
            <AddVideoUrlForm athletes={athletes} defaultAthleteId={athleteId} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
