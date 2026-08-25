import { PlayCircle } from "lucide-react";

import { getMediaPlayback } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type InstructionVideoPlayerProps = {
  src: string;
  title?: string;
  className?: string;
};

export function InstructionVideoPlayer({
  src,
  title = "Watch this workout",
  className,
}: InstructionVideoPlayerProps) {
  const playback = getMediaPlayback(src);

  if (!playback) {
    return (
      <div className={cn("rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm", className)}>
        <p className="font-medium text-amber-950">Video link could not be played.</p>
        <a href={src} className="mt-1 inline-block text-brand underline" target="_blank" rel="noreferrer">
          Open link
        </a>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-800">
        <PlayCircle className="size-4 text-brand" />
        {title}
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
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
