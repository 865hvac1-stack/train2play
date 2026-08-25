import Link from "next/link";

import { AthleteConnectCoachForm } from "@/components/athlete-connect-coach-form";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import { prisma } from "@/lib/db";

export default async function AthleteConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { code } = await searchParams;

  const connections = await prisma.coachAthleteConnection.findMany({
    where: {
      athleteProfileId: ctx.profileId,
      status: {
        in: [CONNECTION_STATUS.APPROVED, CONNECTION_STATUS.PENDING],
      },
    },
    include: {
      coachUser: {
        select: {
          name: true,
          lookingForSport: true,
          organizationMemberships: {
            take: 1,
            include: { organization: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Coaches
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Connect with a coach
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the code your coach shared. They must approve before they can
          assign training.
        </p>
      </div>

      <AthleteConnectCoachForm initialCode={code ?? ""} />

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold">My coaches</h2>
        {connections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
            No coach connections yet. You can still use Train2Play on your own —
            connecting a coach unlocks assigned training.
          </p>
        ) : (
          <ul className="space-y-2">
            {connections.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {c.coachUser.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[
                        c.coachUser.lookingForSport,
                        c.coachUser.organizationMemberships[0]?.organization
                          .name,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Coach"}
                    </p>
                  </div>
                  <span className="text-xs font-bold tracking-wide text-brand uppercase">
                    {c.status === "APPROVED" ? "Connected" : "Pending"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/athlete"
        className="block text-center text-sm text-slate-400 underline-offset-2 hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
