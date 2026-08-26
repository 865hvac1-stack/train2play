import Link from "next/link";

import { AthleteSportsForm } from "@/components/athlete-sports-form";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { brand } from "@/lib/brand";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import { prisma } from "@/lib/db";

export default async function AthleteProfilePage() {
  const ctx = await requireAthleteContext();

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
          Profile
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {ctx.firstName} {ctx.lastName}
        </h1>
        <p className="text-slate-400">
          {ctx.sports.join(" · ")}
          {ctx.position ? ` • ${ctx.position}` : ""}
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-5">
        <div>
          <h2 className="font-heading text-xl font-bold">My sports</h2>
          <p className="mt-1 text-sm text-slate-400">
            Multi-sport athletes see the matching Train2Play courses for every
            sport they play.
          </p>
        </div>
        <AthleteSportsForm
          sports={ctx.sports}
          primarySport={ctx.sport}
          position={ctx.position}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900 p-5">
        <p className="text-sm text-slate-300">
          Your athlete profile is the center of Train2Play. Coaches participate
          in your development — they do not own your account.
        </p>
        <p className="text-xs text-slate-500">
          {brand.name} · {brand.tagline}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold">My coaches</h2>
          <Link
            href="/athlete/connect"
            className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            Connect
          </Link>
        </div>
        {connections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
            No coaches connected yet. You can use Train2Play on your own.
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
                    <p className="font-semibold text-white">{c.coachUser.name}</p>
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

      <SignOutButton />
    </div>
  );
}
