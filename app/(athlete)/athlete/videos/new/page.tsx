import Link from "next/link";

import { AthleteVideoUploadForm } from "@/components/athlete-video-upload-form";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import { prisma } from "@/lib/db";

export default async function AthleteVideoUploadPage() {
  const ctx = await requireAthleteContext();

  const connections = await prisma.coachAthleteConnection.findMany({
    where: {
      athleteProfileId: ctx.profileId,
      status: CONNECTION_STATUS.APPROVED,
    },
    include: {
      coachUser: {
        select: {
          id: true,
          name: true,
          lookingForSport: true,
          organizationMemberships: {
            take: 1,
            include: { organization: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { approvedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Videos
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Upload video
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Send film to a connected coach for review, feedback, and training.
        </p>
      </div>

      <AthleteVideoUploadForm
        defaultSport={ctx.sport}
        coaches={connections.map((c) => ({
          id: c.coachUser.id,
          name: c.coachUser.name,
          sport: c.coachUser.lookingForSport,
          organizationName:
            c.coachUser.organizationMemberships[0]?.organization.name ?? null,
        }))}
      />

      <Link
        href="/athlete/videos"
        className="block text-center text-sm text-slate-400 underline-offset-2 hover:underline"
      >
        Back to videos
      </Link>
    </div>
  );
}
