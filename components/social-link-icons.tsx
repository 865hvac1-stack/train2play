import type { SocialLink } from "@/lib/community/social";
import { cn } from "@/lib/utils";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 1.8H7A2.2 2.2 0 0 0 4.8 7v10A2.2 2.2 0 0 0 7 19.2h10A2.2 2.2 0 0 0 19.2 17V7A2.2 2.2 0 0 0 17 4.8ZM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2Zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8Zm4.55-3.05a.95.95 0 1 1-.95.95.95.95 0 0 1 .95-.95Z"
      />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M23 12.2s0-3.3-.4-4.8c-.2-.9-.9-1.6-1.8-1.8C19 5.2 12 5.2 12 5.2s-7 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 8.9 1 12.2 1 12.2s0 3.3.4 4.8c.2.9.9 1.6 1.8 1.8 1.8.4 8.8.4 8.8.4s7 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.5.4-4.8.4-4.8ZM9.8 15.5V8.9l6.2 3.3-6.2 3.3Z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.59l-5.16-6.74L4.9 22H1.64l8.02-9.16L1.5 2h6.76l4.66 6.18L18.244 2Zm-1.16 18.08h1.81L7 3.82H5.06l12.024 16.26Z"
      />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M14.5 3c.4 2.6 1.9 4.4 4.5 4.7v3.1c-1.5 0-2.9-.5-4.1-1.3v6.7c0 3.5-2.8 6.3-6.4 6.3S2 19.7 2 16.2c0-3.4 2.7-6.2 6.1-6.3v3.2c-1.6.1-2.9 1.4-2.9 3.1 0 1.7 1.4 3.1 3.1 3.1s3.1-1.4 3.1-3.1V3h3.1Z"
      />
    </svg>
  );
}

export const SOCIAL_NETWORK_ICONS = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  x: XIcon,
  tiktok: TikTokIcon,
} as const;

export function SocialLinkIcons({
  links,
  className,
}: {
  links: SocialLink[];
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {links.map((link) => (
        <a
          key={link.network}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition hover:border-brand hover:text-brand"
        >
          {(() => {
            const Icon = SOCIAL_NETWORK_ICONS[link.network];
            return <Icon className="size-4" />;
          })()}
        </a>
      ))}
    </div>
  );
}
