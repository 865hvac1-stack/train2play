import Link from "next/link";

import { reviewContentSubmissionForm } from "@/app/(admin)/admin/community-actions";
import { AdminShell } from "@/components/admin-shell";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { Button } from "@/components/ui/button";
import { getContentSubmissionAdminPayload } from "@/lib/community/content-submissions";
import { prisma } from "@/lib/db";
import { formatMetricValue } from "@/lib/progress";
import { requirePlatformAdmin } from "@/lib/session";

export default async function AdminContentQueuePage() {
  await requirePlatformAdmin();
  const rows = await prisma.athleteContentSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, status: true },
  });
  const payloads = (
    await Promise.all(rows.map((row) => getContentSubmissionAdminPayload(row.id)))
  ).filter((row) => row !== null);

  return (
    <AdminShell
      title="Athlete content queue"
      description="Submissions use the existing video record plus the live Player Profile. Do not re-enter athlete information."
    >
      {payloads.length === 0 ? (
        <p className="text-sm text-slate-500">No athlete content submissions yet.</p>
      ) : (
        <ul className="space-y-4">
          {payloads.map((payload) => {
            const { submission, identity, profileUrl, socials, metricSummary } = payload;
            return (
              <li
                key={submission.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-brand uppercase">
                      {submission.status} · {submission.category}
                    </p>
                    <h2 className="font-heading text-xl font-bold">
                      {identity.displayName}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {[
                        identity.sport,
                        identity.position,
                        identity.ageGroup,
                        identity.graduationYear ? `Class of ${identity.graduationYear}` : null,
                        identity.organizationName,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <Link href={profileUrl} className="text-sm font-semibold text-brand underline">
                    Player Profile
                  </Link>
                </div>
                <InstructionVideoPlayer
                  src={submission.videoReview.trainingVideo.videoUrl}
                  title={submission.videoReview.title}
                />
                {metricSummary ? (
                  <p className="text-sm">
                    Linked result: {metricSummary.name}{" "}
                    {formatMetricValue(metricSummary.current, metricSummary.unit)}
                    {metricSummary.previous != null
                      ? ` · previous ${formatMetricValue(metricSummary.previous, metricSummary.unit)}`
                      : ""}
                    {metricSummary.delta != null
                      ? ` · ${metricSummary.delta > 0 ? "+" : ""}${formatMetricValue(metricSummary.delta, metricSummary.unit)}`
                      : ""}{" "}
                    · {metricSummary.verificationType} ·{" "}
                    {metricSummary.recordedAt.toLocaleDateString()}
                  </p>
                ) : null}
                {submission.note ? (
                  <p className="text-sm text-slate-600">Note: {submission.note}</p>
                ) : null}
                <p className="text-xs text-slate-500">
                  Feature permission: {submission.featurePermission ? "yes" : "no"} · Social:{" "}
                  {submission.socialMediaPermission ? "yes" : "no"} · Guardian:{" "}
                  {submission.guardianApproved ? "yes" : "n/a"}
                </p>
                {socials.length > 0 ? (
                  <p className="text-xs text-slate-500">
                    Public socials: {socials.map((link) => link.network).join(", ")}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">No public social handles</p>
                )}
                <form action={reviewContentSubmissionForm} className="grid gap-2 sm:grid-cols-4">
                  <input type="hidden" name="id" value={submission.id} />
                  <select name="status" defaultValue={submission.status} className="h-10 rounded-lg border px-2">
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <input
                    name="adminNote"
                    defaultValue={submission.adminNote ?? ""}
                    placeholder="Admin note"
                    className="h-10 rounded-lg border px-2 sm:col-span-2"
                  />
                  <Button type="submit">Update</Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
