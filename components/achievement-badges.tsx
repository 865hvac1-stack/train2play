import { Medal } from "lucide-react";

import { cn } from "@/lib/utils";

export function AchievementBadges({
  achievements,
  className,
  emptyMessage = "Keep training to unlock your first achievement.",
}: {
  achievements: { id: string; key: string; title: string; description?: string | null }[];
  className?: string;
  emptyMessage?: string;
}) {
  if (achievements.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyMessage}</p>;
  }
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {achievements.map((achievement) => (
        <li
          key={achievement.id}
          className="rounded-2xl border border-brand/40 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-4 shadow-[0_0_0_1px_rgba(255,140,0,0.08)]"
        >
          <div className="flex size-9 items-center justify-center rounded-full border border-brand/40 bg-brand/10">
            <Medal className="size-4 text-brand" />
          </div>
          <p className="font-heading mt-3 text-sm font-bold tracking-wide text-white uppercase">
            {achievement.title}
          </p>
          {achievement.description ? (
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{achievement.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
