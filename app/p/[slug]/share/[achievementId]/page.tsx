import Link from "next/link";
import { Medal } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { buildSafeIdentity } from "@/lib/community/privacy";
import { notFound } from "next/navigation";

export default async function AchievementShareCardPage({
  params,
}: {
  params: Promise<{ slug: string; achievementId: string }>;
}) {
  const { slug, achievementId } = await params;
  const profile = await prisma.athleteProfile.findUnique({
    where: { publicSlug: slug },
    include: {
      sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
      achievements: { where: { id: achievementId, shareable: true }, take: 1 },
    },
  });
  if (!profile || profile.profileVisibility === "PRIVATE" || profile.achievements.length === 0) {
    notFound();
  }
  const achievement = profile.achievements[0]!;
  const identity = buildSafeIdentity(profile);
  const url = `${getAppBaseUrl()}/p/${slug}`;

  return (
    <div className="flex min-h-full items-center justify-center bg-black p-4 text-white">
      <article className="w-full max-w-md overflow-hidden rounded-3xl border border-brand/50 bg-gradient-to-b from-zinc-900 to-black shadow-[0_30px_80px_-40px_rgba(255,102,0,0.85)]">
        <div className="bg-brand px-5 py-4 text-black">
          <BrandLogo size="sm" variant="light" />
        </div>
        <div className="space-y-4 p-6">
          <p className="text-[11px] font-bold tracking-[0.2em] text-brand uppercase">
            Train2Play achievement
          </p>
          <div className="flex items-center gap-3">
            <Medal className="size-10 text-brand" />
            <div>
              <h1 className="font-heading text-3xl font-bold">{achievement.title}</h1>
              <p className="text-sm text-zinc-400">{identity.displayName}</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300">
            {[identity.sport, identity.ageGroup, identity.location].filter(Boolean).join(" • ")}
          </p>
          {achievement.description ? (
            <p className="text-sm text-zinc-400">{achievement.description}</p>
          ) : null}
          <Link href={url} className="block text-sm font-semibold text-brand">
            {url.replace(/^https?:\/\//, "")}
          </Link>
          <p className="text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Train. Track. Improve. Compete.
          </p>
        </div>
      </article>
    </div>
  );
}
