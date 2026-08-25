import { prisma } from "@/lib/db";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";

export default async function AthleteVideosPage() {
  const ctx = await requireAthleteContext();

  const videos = ctx.athleteId
    ? await prisma.trainingVideo.findMany({
        where: { athleteId: ctx.athleteId },
        orderBy: { updatedAt: "desc" },
        take: 20,
      })
    : [];

  const planVideos = ctx.athleteId
    ? await prisma.workout.findMany({
        where: {
          instructionVideoUrl: { not: null },
          trainingPlan: { athleteId: ctx.athleteId, status: "ACTIVE" },
        },
        select: {
          id: true,
          title: true,
          instructionVideoUrl: true,
          trainingPlan: { select: { title: true } },
        },
        take: 20,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Videos
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Watch & learn
        </h1>
      </div>

      {planVideos.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold">Training clips</h2>
          {planVideos.map((w) =>
            w.instructionVideoUrl ? (
              <div
                key={w.id}
                className="space-y-2 rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                <p className="font-semibold">{w.title}</p>
                <p className="text-xs text-slate-400">{w.trainingPlan.title}</p>
                <InstructionVideoPlayer src={w.instructionVideoUrl} title="Play" />
              </div>
            ) : null,
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold">Coach film</h2>
        {videos.length > 0 ? (
          videos.map((video) => (
            <div
              key={video.id}
              className="space-y-2 rounded-2xl border border-white/10 bg-zinc-900 p-4"
            >
              <p className="font-semibold">{video.title}</p>
              {video.description ? (
                <p className="text-sm text-slate-400">{video.description}</p>
              ) : null}
              <InstructionVideoPlayer src={video.videoUrl} title="Play" />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">
            When your coach uploads film or training videos for you, they appear
            here.
          </p>
        )}
      </section>
    </div>
  );
}
