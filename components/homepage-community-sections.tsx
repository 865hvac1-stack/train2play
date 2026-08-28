import Link from "next/link";

import { PlayerOfTheWeekCard } from "@/components/player-of-the-week-card";
import { getPublicHomepageCommunity } from "@/lib/community/homepage";

export async function HomepageCommunitySections() {
  const data = await getPublicHomepageCommunity();
  if (!data.playerOfTheWeek && data.modules.length === 0) return null;

  return (
    <section className="border-t border-white/10 bg-zinc-950 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-10">
        {data.playerOfTheWeek ? (
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
              Player of the Week
            </p>
            <h2 className="font-heading mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Real athletes. Real work. Real progress.
            </h2>
            <div className="mt-6">
              <PlayerOfTheWeekCard potw={data.playerOfTheWeek} />
            </div>
          </div>
        ) : null}

        {data.modules.length > 0 ? (
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
              {data.weekHeadline || "What's happening on Train2Play"}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.modules.map((module) => (
                <article
                  key={module.id}
                  className="rounded-2xl border border-white/10 bg-black p-5"
                >
                  <h3 className="font-heading text-xl font-bold text-white">
                    {module.title}
                  </h3>
                  {module.subtitle ? (
                    <p className="mt-1 text-sm text-brand">{module.subtitle}</p>
                  ) : null}
                  {module.body ? (
                    <p className="mt-2 text-sm text-zinc-400">{module.body}</p>
                  ) : null}
                  {module.entries.length > 0 ? (
                    <ol className="mt-4 space-y-2">
                      {module.entries.map((entry, index) => (
                        <li
                          key={`${entry.displayName}-${index}`}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-white">
                            {index + 1}. {entry.displayName}
                          </span>
                          <span className="font-heading font-bold text-brand">
                            {entry.valueLabel}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {module.href ? (
                    <Link
                      href={module.href}
                      className="mt-4 inline-block text-sm font-semibold text-brand"
                    >
                      Join Train2Play
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
