import { Activity, Film, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminActivity } from "@/lib/admin-analytics";
import { prisma } from "@/lib/db";

const FILTERS = [
  "ALL",
  "ATHLETES",
  "COACHES",
  "DIRECTORS",
  "TRAINING",
  "VIDEOS",
  "PROGRESS",
  "ORGANIZATIONS",
] as const;

function relativeTime(date: Date) {
  const hours = Math.floor((Date.now() - date.getTime()) / 3600000);
  if (hours < 1) return "Less than an hour ago";
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; attention?: string }>;
}) {
  const query = await searchParams;
  const reviewCutoff = new Date();
  reviewCutoff.setHours(reviewCutoff.getHours() - 48);
  const type = FILTERS.includes(query.type as (typeof FILTERS)[number])
    ? query.type!
    : "ALL";
  const [activity, audits, waitingReviews] = await Promise.all([
    getAdminActivity({ type, limit: 100 }),
    prisma.adminAuditLog.findMany({
      include: { actorUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    query.attention === "waiting"
      ? prisma.videoReview.findMany({
          where: {
            status: { in: ["AWAITING_REVIEW", "IN_REVIEW"] },
            submittedAt: { lte: reviewCutoff },
          },
          include: {
            athleteProfile: {
              include: {
                memberships: {
                  where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
                  include: { organization: true },
                  take: 1,
                },
              },
            },
            coachUser: true,
          },
          orderBy: { submittedAt: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  return (
    <AdminShell
      title="Activity"
      description="Meaningful platform events and administrative audit history."
    >
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant={type === filter ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link
                href={`/admin/activity${filter === "ALL" ? "" : `?type=${filter}`}`}
              >
                {filter[0] + filter.slice(1).toLowerCase()}
              </Link>
            }
          />
        ))}
      </div>

      {query.attention === "waiting" ? (
        <section className="mt-5 overflow-hidden rounded-2xl border border-amber-300 bg-white">
          <div className="border-b border-amber-200 bg-amber-50 p-4">
            <h2 className="font-heading text-lg font-bold">
              Video reviews waiting more than 48 hours
            </h2>
            <p className="text-sm text-slate-600">
              Move directly from the alert to the responsible review.
            </p>
          </div>
          {waitingReviews.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              Everything is caught up. No reviews have crossed 48 hours.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="p-3">Athlete</th>
                    <th className="p-3">Coach</th>
                    <th className="p-3">Organization</th>
                    <th className="p-3">Sport</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3">Wait time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingReviews.map((review) => (
                    <tr key={review.id} className="border-t">
                      <td className="p-3 font-semibold">
                        {review.athleteProfile.firstName}{" "}
                        {review.athleteProfile.lastName}
                      </td>
                      <td className="p-3">{review.coachUser.name}</td>
                      <td className="p-3">
                        {review.athleteProfile.memberships[0]?.organization.name ??
                          "—"}
                      </td>
                      <td className="p-3">{review.sport}</td>
                      <td className="p-3">
                        {review.submittedAt.toLocaleString()}
                      </td>
                      <td className="p-3">{relativeTime(review.submittedAt)}</td>
                      <td className="p-3">
                        <Badge variant="outline">{review.status}</Badge>
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={
                            <Link href={`/videos/reviews/${review.id}`}>Open</Link>
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-2xl border bg-white p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <Activity className="size-5 text-brand" />
            Live on Train2Play
          </h2>
          {activity.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-slate-500">
              Platform activity will appear here as users begin training.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {activity.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-3 py-3"
                >
                  <span className="rounded-lg bg-brand/10 p-2 text-brand">
                    {item.type === "VIDEOS" ? (
                      <Film className="size-4" />
                    ) : (
                      <Activity className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.title}</p>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {relativeTime(item.at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <ShieldCheck className="size-5 text-brand" />
            Admin audit log
          </h2>
          {audits.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Material Admin changes will appear here.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {audits.map((audit) => (
                <div key={audit.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{audit.action}</Badge>
                    <span className="text-xs text-slate-400">
                      {audit.createdAt.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{audit.summary}</p>
                  <p className="text-xs text-slate-500">
                    By {audit.actorUser.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
