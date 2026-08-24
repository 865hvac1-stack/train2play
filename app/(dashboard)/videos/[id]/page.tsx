import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" asChild className="mt-0.5">
            <Link href="/videos">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{video.title}</h1>
              <Badge variant="secondary">{video.sourceType === "UPLOAD" ? "Upload" : "URL"}</Badge>
            </div>
            {video.athlete ? (
              <p className="text-muted-foreground mt-1 text-sm">
                Athlete:{" "}
                <Link href={`/athletes/${video.athlete.id}`} className="text-primary hover:underline">
                  {video.athlete.firstName} {video.athlete.lastName}
                </Link>
              </p>
            ) : null}
            {video.description ? (
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{video.description}</p>
            ) : null}
          </div>
        </div>

        <form action={deleteVideo}>
          <Button type="submit" variant="outline" size="sm" className="text-destructive">
            <Trash2 className="size-4" />
            Delete video
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Coaching workspace</CardTitle>
          <p className="text-muted-foreground text-sm">
            Pause the video, draw on the frame, then add written direction below. Saved notes appear
            in the sidebar — click to jump back to that moment.
          </p>
        </CardHeader>
        <CardContent>
          <VideoAnnotator
            videoId={video.id}
            videoUrl={video.videoUrl}
            initialAnnotations={video.annotations}
          />
        </CardContent>
      </Card>
    </div>
  );
}
