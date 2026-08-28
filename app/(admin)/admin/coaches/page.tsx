import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { formatBackgroundCheckStatus, formatDiscoveryStatus } from "@/lib/coaching/status";

const TABS = [
  ["SUBMITTED", "New applications"],
  ["UNDER_REVIEW", "Under review"],
  ["APPROVED", "Approved"],
  ["DECLINED", "Declined"],
  ["SUSPENDED", "Suspended"],
  ["BG_PENDING", "Background pending"],
  ["BG_REVIEW", "Background review"],
] as const;

export default async function AdminCoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const tab = TABS.some((row) => row[0] === status) ? status! : "SUBMITTED";

  const where =
    tab === "BG_PENDING"
      ? { backgroundCheckStatus: "PENDING" }
      : tab === "BG_REVIEW"
        ? { backgroundCheckStatus: "REVIEW_REQUIRED" }
        : { discoveryStatus: tab };

  const rows = await prisma.coachProfile.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, isActive: true } },
      sports: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { submittedAt: "desc" },
    take: 80,
  });

  return (
    <AdminShell
      title="Coach approvals"
      description="A Coach account is not Train2Play Approved until you review the profile. Background-check status is separate."
    >
      <div className="flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/coaches?status=${value}`}
            className={
              tab === value
                ? "rounded-full bg-brand px-3 py-2 text-xs font-bold text-black"
                : "rounded-full border border-slate-200 px-3 py-2 text-xs font-bold"
            }
          >
            {label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No coaches in this queue.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/coaches/${row.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{row.displayName || row.user.name}</p>
                    <p className="text-sm text-slate-500">
                      {[row.sports[0]?.sport, row.organizationName, row.locationLabel]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                    <p className="text-xs text-slate-400">{row.user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge>{formatDiscoveryStatus(row.discoveryStatus)}</Badge>
                    <Badge variant="outline">{formatBackgroundCheckStatus(row.backgroundCheckStatus)}</Badge>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
