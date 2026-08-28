import Link from "next/link";

import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { ShareProfileControls } from "@/components/share-profile-controls";
import { getAppBaseUrl } from "@/lib/app-url";
import { brand } from "@/lib/brand";

export function PlayerOfTheWeekCard({
  potw,
  tone = "dark",
}: {
  potw: {
    id: string;
    identity: {
      displayName: string;
      sport: string | null;
      ageGroup: string | null;
      location: string | null;
    };
    slug: string | null;
    description: string;
    highlight: string | null;
    videoUrl: string | null;
    videoTitle: string | null;
  };
  tone?: "dark" | "light";
}) {
  const dark = tone === "dark";
  const profileUrl = potw.slug ? `${getAppBaseUrl()}/p/${potw.slug}` : null;
  return (
    <article
      className={
        dark
          ? "overflow-hidden rounded-3xl border border-brand/40 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-5 text-white shadow-[0_20px_50px_-28px_rgba(255,102,0,0.7)]"
          : "overflow-hidden rounded-3xl border border-black/10 bg-white p-5 text-black"
      }
    >
      <p className="text-[11px] font-bold tracking-[0.2em] text-brand uppercase">
        Train2Play Player of the Week
      </p>
      <h2 className="font-heading mt-2 text-3xl font-bold tracking-tight">
        {potw.identity.displayName}
      </h2>
      <p className={dark ? "mt-1 text-zinc-400" : "mt-1 text-zinc-600"}>
        {[potw.identity.sport, potw.identity.ageGroup, potw.identity.location]
          .filter(Boolean)
          .join(" • ")}
      </p>
      {potw.videoUrl ? (
        <div className="mt-4 overflow-hidden rounded-2xl">
          <InstructionVideoPlayer
            src={potw.videoUrl}
            title={potw.videoTitle ?? "Featured video"}
            tone={dark ? "dark" : "light"}
          />
        </div>
      ) : null}
      <p className="mt-4 text-sm leading-relaxed">{potw.description}</p>
      {potw.highlight ? (
        <p className="mt-3 inline-flex rounded-full bg-brand px-3 py-1 text-xs font-bold tracking-wide text-black uppercase">
          {potw.highlight}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {potw.slug ? (
          <Link
            href={`/p/${potw.slug}`}
            className="inline-flex min-h-11 items-center rounded-2xl bg-brand px-4 text-sm font-bold text-black"
          >
            View player profile
          </Link>
        ) : null}
        {profileUrl ? (
          <ShareProfileControls
            url={profileUrl}
            title={`${potw.identity.displayName} — ${brand.name} Player of the Week`}
            text={potw.description}
          />
        ) : null}
      </div>
    </article>
  );
}
