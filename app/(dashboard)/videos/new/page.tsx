import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddVideoUrlForm, UploadVideoForm } from "@/components/video-forms";
import { isProductionRuntime } from "@/lib/env";
import { isObjectStorageConfigured } from "@/lib/storage";
import { requireCoachId } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function NewVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string }>;
}) {
  const coachId = await requireCoachId();
  const { athleteId } = await searchParams;
  const uploadsEnabled =
    !isProductionRuntime() || isObjectStorageConfigured();

  const athletes = await prisma.athlete.findMany({
    where: { coachId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <DashboardShell
      title="Add video"
      description="Upload from your phone camera or gallery, or paste a direct MP4 link."
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
      {!uploadsEnabled ? (
        <div className="mb-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Phone uploads need one simple setup step</p>
          <p>
            Add a free <strong>Cloudinary</strong> account and paste{" "}
            <code className="rounded bg-amber-100 px-1">CLOUDINARY_URL</code> into Railway
            (about 2 minutes). Guide:{" "}
            <code className="rounded bg-amber-100 px-1">docs/VIDEO-UPLOAD.md</code>. Until then,
            you can still paste a direct MP4 URL below.
          </p>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-2">
        <Card className="order-1 border-brand/20 shadow-sm lg:order-none">
          <CardHeader>
            <CardTitle>Upload from phone / device</CardTitle>
            <CardDescription>
              Record with your camera or pick a clip from Photos. Best for coaches on the field.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadsEnabled ? (
              <UploadVideoForm athletes={athletes} defaultAthleteId={athleteId} />
            ) : (
              <p className="text-sm text-slate-600">
                Upload is unavailable until cloud storage is configured. Use Link URL for now.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="order-2 lg:order-none">
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
