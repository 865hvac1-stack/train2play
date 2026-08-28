import Link from "next/link";
import { notFound } from "next/navigation";

import { reviewCoachProfileForm, updateBackgroundCheckForm } from "@/app/(admin)/admin/coaches/actions";
import { AdminShell } from "@/components/admin-shell";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { Button } from "@/components/ui/button";
import { BACKGROUND_CHECK_STATUS, formatBackgroundCheckStatus, formatDiscoveryStatus } from "@/lib/coaching/status";
import { prisma } from "@/lib/db";
import { CONNECTION_STATUS } from "@/lib/coach-connections";

export default async function AdminCoachReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await prisma.coachProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true, isActive: true } },
      sports: true,
      videos: { include: { trainingVideo: true } },
      featuredVideo: true,
    },
  });
  if (!profile) notFound();

  const [activeAthletes, videoReviews] = await Promise.all([
    prisma.coachAthleteConnection.count({
      where: { coachUserId: profile.userId, status: CONNECTION_STATUS.APPROVED },
    }),
    prisma.videoReview.count({
      where: { coachUserId: profile.userId, status: { in: ["REVIEWED", "IN_REVIEW"] } },
    }),
  ]);

  return (
    <AdminShell
      title={profile.displayName || profile.user.name}
      description="Review the Coach Profile for discovery. Private admin notes never appear on the public profile."
    >
      <div className="mt-5 flex items-start gap-4">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="size-20 rounded-2xl object-cover" />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-2xl bg-slate-200 font-heading text-2xl font-bold">
            {(profile.displayName || profile.user.name).charAt(0)}
          </div>
        )}
        <div>
          <p className="text-sm text-slate-500">
            {profile.user.email} · Joined {profile.user.createdAt.toLocaleDateString()} ·{" "}
            {formatDiscoveryStatus(profile.discoveryStatus)} · Background check{" "}
            {formatBackgroundCheckStatus(profile.backgroundCheckStatus)}
          </p>
          <p className="mt-1 text-sm">
            Active athletes: {activeAthletes} · Video reviews worked: {videoReviews}
            {profile.publicSlug ? (
              <>
                {" "}
                ·{" "}
                <Link href={`/coach/${profile.publicSlug}`} className="font-semibold text-brand underline">
                  Public profile
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4 text-sm">
          <p>
            <strong>Bio:</strong> {profile.bio || "—"}
          </p>
          <p className="mt-2">
            <strong>Org:</strong> {profile.organizationName || "—"}
          </p>
          <p>
            <strong>Location:</strong> {profile.locationLabel || profile.serviceArea || "—"}
          </p>
          <p>
            <strong>Experience:</strong> {profile.experienceText || "—"}
          </p>
          <p>
            <strong>Certifications:</strong> {profile.certifications || "—"}
          </p>
          <p className="mt-2">
            Sports: {profile.sports.map((row) => `${row.sport}${row.isPrimary ? " (primary)" : ""}`).join(", ") || "—"}
          </p>
          <p>Specialties: {profile.sports.flatMap((row) => row.specialties).join(", ") || "—"}</p>
          <p>
            Methods: {[profile.inPersonCoaching ? "In-person" : null, profile.remoteCoaching ? "Remote" : null]
              .filter(Boolean)
              .join(" • ") || "—"}
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border bg-white p-4">
          <form action={reviewCoachProfileForm} className="space-y-2">
            <input type="hidden" name="id" value={profile.id} />
            <textarea
              name="adminNote"
              defaultValue={profile.adminNote ?? ""}
              placeholder="Private admin note"
              className="min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <textarea
              name="requestChangesNote"
              defaultValue={profile.requestChangesNote ?? ""}
              placeholder="Request changes (visible to coach)"
              className="min-h-16 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <textarea
              name="declineReason"
              defaultValue={profile.declineReason ?? ""}
              placeholder="Decline note"
              className="min-h-16 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {["APPROVE", "DECLINE", "REQUEST_CHANGES", "UNDER_REVIEW", "SUSPEND", "REACTIVATE"].map(
                (action) => (
                  <Button key={action} type="submit" name="action" value={action} variant={action === "APPROVE" ? "default" : "outline"}>
                    {action.replaceAll("_", " ")}
                  </Button>
                ),
              )}
            </div>
          </form>

          <form action={updateBackgroundCheckForm} className="space-y-2 border-t pt-3">
            <input type="hidden" name="id" value={profile.id} />
            <p className="text-sm font-semibold">Background check (status only — no report details)</p>
            <select name="status" defaultValue={profile.backgroundCheckStatus} className="h-10 w-full rounded-lg border px-2">
              {Object.values(BACKGROUND_CHECK_STATUS).map((value) => (
                <option key={value} value={value}>
                  {formatBackgroundCheckStatus(value)}
                </option>
              ))}
            </select>
            <input name="provider" defaultValue={profile.backgroundCheckProvider ?? ""} placeholder="Provider (future)" className="h-10 w-full rounded-lg border px-2" />
            <input name="reference" defaultValue={profile.backgroundCheckReference ?? ""} placeholder="Admin reference" className="h-10 w-full rounded-lg border px-2" />
            <input name="note" defaultValue={profile.backgroundCheckAdminNote ?? ""} placeholder="Private note" className="h-10 w-full rounded-lg border px-2" />
            <input
              name="expiresAt"
              type="date"
              defaultValue={
                profile.backgroundCheckExpiresAt
                  ? profile.backgroundCheckExpiresAt.toISOString().slice(0, 10)
                  : ""
              }
              className="h-10 w-full rounded-lg border px-2"
            />
            <Button type="submit">Update background-check status</Button>
          </form>
        </section>
      </div>

      {profile.featuredVideo ? (
        <div className="mt-4 max-w-xl">
          <InstructionVideoPlayer src={profile.featuredVideo.videoUrl} title={profile.featuredVideo.title} />
        </div>
      ) : null}
    </AdminShell>
  );
}
