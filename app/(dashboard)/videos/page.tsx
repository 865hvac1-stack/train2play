import Link from "next/link";
import { Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireCoachId } from "@/lib/session";
import { getVideosForCoach } from "@/lib/videos-server";

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default async function VideosPage() {
  const coachId = await requireCoachId();
  const videos = await getVideosForCoach(coachId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Video coaching</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload film, pause at key moments, draw arrows and circles, and add written direction.
          </p>
        </div>
        <Button asChild>
          <Link href="/videos/new">
            <Plus className="size-4" />
            Add video
          </Link>
        </Button>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Video className="text-muted-foreground mb-4 size-12" />
            <h2 className="text-lg font-medium">No videos yet</h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Upload game film or paste a direct MP4 link. Open a clip to draw coaching notes on
              the frame and save direction at that timestamp.
            </p>
            <Button asChild className="mt-6">
              <Link href="/videos/new">Add your first video</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link key={video.id} href={`/videos/${video.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base">{video.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {video.sourceType === "UPLOAD" ? "Upload" : "URL"}
                    </Badge>
                  </div>
                  {video.athlete
                    ? `${video.athlete.firstName} ${video.athlete.lastName}`
                    : "Team / general"}
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {video.description || "No description"}
                  </p>
                  <p className="text-muted-foreground mt-3 text-xs">
                    {video._count.annotations} coaching note
                    {video._count.annotations === 1 ? "" : "s"}
                    {video.annotations[0]
                      ? ` · latest at ${formatTime(video.annotations[0].timestampMs)}`
                      : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
