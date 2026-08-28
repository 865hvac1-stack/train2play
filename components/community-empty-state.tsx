import Link from "next/link";

export function CommunityEmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <section className="rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-5">
      <h2 className="font-heading font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
      {cta ? (
        <Link
          href={cta.href}
          className="mt-3 inline-flex min-h-11 items-center text-sm font-bold tracking-wide text-brand uppercase"
        >
          {cta.label} →
        </Link>
      ) : null}
    </section>
  );
}
