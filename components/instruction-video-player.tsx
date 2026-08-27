import { PlayCircle } from "lucide-react";

import { getMediaPlayback } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type InstructionVideoPlayerProps = {
  src: string;
  title?: string;
  className?: string;
  tone?: "light" | "dark";
};

export function InstructionVideoPlayer({
  src,
  title = "Watch this workout",
  className,
  tone = "light",
}: InstructionVideoPlayerProps) {
  const playback = getMediaPlayback(src);
  const dark = tone === "dark";

  if (!playback) {
    return (
      <div
        className={cn(
          "rounded-xl border p-3 text-sm",
          dark
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-amber-200 bg-amber-50",
          className,
        )}
      >
        <p className={cn("font-medium", dark ? "text-amber-100" : "text-amber-950")}>
          Video link could not be played.
        </p>
        <a href={src} className="mt-1 inline-block text-brand underline" target="_blank" rel="noreferrer">
          Open link
        </a>
      </div>
    );
  }

  return (
    <div className={className}>
      <p
        className={cn(
          "mb-2 flex items-center gap-1.5 text-sm font-medium",
          dark ? "text-slate-100" : "text-slate-800",
        )}
      >
        <PlayCircle className="size-4 text-brand" />
        {title}
      </p>
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-black",
          dark ? "border-white/10" : "border-slate-200",
        )}
      >
        {playback.kind === "file" ? (
          <video
            controls
            playsInline
            preload="metadata"
            className="aspect-video max-h-[420px] w-full bg-black"
            src={playback.src}
          >
            <a href={playback.src} className="text-brand underline">
              Download / open video
            </a>
          </video>
        ) : (
          <iframe
            title={title}
            src={playback.embedSrc}
            className="aspect-video max-h-[420px] w-full bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      {playback.kind !== "file" ? (
        <a
          href={playback.watchUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
        >
          Open on {playback.kind === "youtube" ? "YouTube" : "Vimeo"}
        </a>
      ) : null}
    </div>
  );
}
