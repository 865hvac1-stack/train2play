import { Medal } from "lucide-react";

import { cn } from "@/lib/utils";

export function AchievementBadges({
  achievements,
  className,
}: {
  achievements: { id: string; key: string; title: string; description?: string | null }[];
  className?: string;
}) {
  if (achievements.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        Train, set PRs, and complete challenges to earn badges.
      </p>
    );
  }
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {achievements.map((achievement) => (
        <li
          key={achievement.id}
          className="rounded-2xl border border-brand/30 bg-gradient-to-br from-zinc-900 to-black p-4"
        >
          <Medal className="size-5 text-brand" />
          <p className="font-heading mt-2 text-sm font-bold tracking-wide text-white uppercase">
            {achievement.title}
          </p>
          {achievement.description ? (
            <p className="mt-1 text-xs text-zinc-400">{achievement.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
