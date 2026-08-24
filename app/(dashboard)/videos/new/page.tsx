import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    orderBy: { name: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/videos">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add video</h1>
          <p className="text-muted-foreground text-sm">
            Upload from your device or link a direct MP4 for on-frame coaching notes.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
    </div>
  );
}
