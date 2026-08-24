import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoAnnotator } from "@/components/video-annotator";
import { deleteTrainingVideoAction } from "@/app/(dashboard)/videos/actions";
import { requireCoachId } from "@/lib/session";
import { getVideoForCoach } from "@/lib/videos-server";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const coachId = await requireCoachId();
  const { id } = await params;
  const video = await getVideoForCoach(coachId, id);

  if (!video) notFound();

  const deleteVideo = deleteTrainingVideoAction.bind(null, video.id);

  return (
    <DashboardShell
      title={video.title}
      description={
        video.athlete
          ? `${video.athlete.firstName} ${video.athlete.lastName}${video.description ? ` · ${video.description}` : ""}`
          : video.description ?? "Pause, draw on the frame, and save coaching notes."
      }
      action={
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{video.sourceType === "UPLOAD" ? "Upload" : "URL"}</Badge>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href="/videos">
                <ArrowLeft className="size-4" />
                All videos
              </Link>
            }
          />
          <form action={deleteVideo}>
            <Button type="submit" variant="outline" className="text-destructive">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </form>
        </div>
      }
    >
      {video.athlete ? (
        <p className="text-muted-foreground -mt-2 mb-4 text-sm">
          Athlete:{" "}
          <Link href={`/athletes/${video.athlete.id}`} className="text-primary hover:underline">
            {video.athlete.firstName} {video.athlete.lastName}
          </Link>
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Coaching workspace</CardTitle>
          <p className="text-muted-foreground text-sm">
            Press play to watch. Pause at a key moment, click <strong>Draw on frame</strong>, then
            add your coaching direction below.
          </p>
        </CardHeader>
        <CardContent>
          <VideoAnnotator
            videoId={video.id}
            videoUrl={video.videoUrl}
            initialAnnotations={video.annotations.map((annotation) => ({
              id: annotation.id,
              timestampMs: annotation.timestampMs,
              label: annotation.label,
              note: annotation.note,
              strokes: annotation.strokes,
            }))}
          />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
