import Link from "next/link";
import { Flag, LayoutGrid, Medal, Trophy, Sparkles } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { requirePlatformAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getCurrentPlayerOfTheWeek } from "@/lib/community/player-of-the-week";
import { getPublishedHomepageWeek } from "@/lib/community/homepage";

export default async function AdminCommunityPage() {
  await requirePlatformAdmin();
  const [potw, flagged, challenges, week] = await Promise.all([
    getCurrentPlayerOfTheWeek(),
    prisma.metricEntry.count({ where: { resultStatus: "FLAGGED" } }),
    prisma.challenge.count({ where: { status: "PUBLISHED" } }),
    getPublishedHomepageWeek(),
  ]);

  const cards = [
    {
      href: "/admin/community/homepage",
      icon: LayoutGrid,
      title: "Weekly homepage",
      detail: week
        ? `Published week of ${week.weekOf.toLocaleDateString()} · ${week.modules.length} modules`
        : "Nothing is pushing to the public homepage this week",
    },
    {
      href: "/admin/community/player-of-the-week",
      icon: Trophy,
      title: "Player of the Week",
      detail: potw
        ? `${potw.athleteProfile.firstName} ${potw.athleteProfile.lastName.charAt(0)}.`
        : "No published winner",
    },
    {
      href: "/admin/community/challenges",
      icon: Sparkles,
      title: "Challenges",
      detail: `${challenges} live`,
    },
    {
      href: "/admin/community/verification",
      icon: Flag,
      title: "Verification & flags",
      detail: `${flagged} flagged results`,
    },
    {
      href: "/admin/community/leaderboards",
      icon: Medal,
      title: "Leaderboards",
      detail: "Preview ranking engine output",
    },
  ];

  return (
    <AdminShell
      title="Community"
      description="Command center for Player of the Week, homepage modules, challenges, leaderboards, and result verification."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand/50"
          >
            <card.icon className="size-5 text-brand" />
            <h2 className="font-heading mt-3 text-xl font-bold">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
