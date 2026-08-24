import Link from "next/link";
import { Plus, Video } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <DashboardShell
      title="Video coaching"
      description="Upload film, pause at key moments, draw arrows and circles, and add written direction."
      action={
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          render={
            <Link href="/videos/new">
              <Plus className="size-4" />
              Add video
            </Link>
          }
        />
      }
    >
      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Video className="text-muted-foreground mb-4 size-12" />
            <h2 className="text-lg font-medium">No videos yet</h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Upload game film or paste a direct MP4 link. Open a clip to draw coaching notes on
              the frame and save direction at that timestamp.
            </p>
            <Button
              className="mt-6 bg-emerald-600 hover:bg-emerald-700"
              render={<Link href="/videos/new">Add your first video</Link>}
            />
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
                  <CardDescription>
                    {video.athlete
                      ? `${video.athlete.firstName} ${video.athlete.lastName}`
                      : "Team / general"}
                  </CardDescription>
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
    </DashboardShell>
  );
}
