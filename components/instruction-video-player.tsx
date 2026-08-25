import { PlayCircle } from "lucide-react";

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
  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-800">
        <PlayCircle className="size-4 text-brand" />
        {title}
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
        <video
          controls
          playsInline
          preload="metadata"
          className="aspect-video max-h-[420px] w-full bg-black"
          src={src}
        >
          <a href={src} className="text-brand underline">
            Download / open video
          </a>
        </video>
      </div>
    </div>
  );
}
