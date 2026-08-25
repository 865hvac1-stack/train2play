import Link from "next/link";
import Image from "next/image";
import { Crosshair, Film, MapPin, Users } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { brand } from "@/lib/brand";
import { showDemoCredentials } from "@/lib/env";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

const features = [
  {
    icon: Users,
    title: "One athlete profile",
    body: "Roster, plans, metrics, film, and parent share links — tied to the kid, not scattered notes.",
  },
  {
    icon: Crosshair,
    title: "Progress that coaches trust",
    body: "Log velo, bat speed, and exit velo. Compare against other athletes in the same sport.",
  },
  {
    icon: Film,
    title: "Film with direction",
    body: "Upload from your phone, mark key frames, and leave notes parents and athletes can follow.",
  },
  {
    icon: MapPin,
    title: "Pickup when you need coverage",
    body: "List available players by zip and connect with nearby coaches who need a fill-in.",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompletedAt: true, role: true },
    });

    const { getLoginLandingPath } = await import("@/lib/roles");
    redirect(
      getLoginLandingPath({
        role: user?.role,
        onboardingCompletedAt: user?.onboardingCompletedAt,
      }),
    );
  }

  return (
    <div className="min-h-full max-w-[100vw] overflow-x-hidden bg-black text-white">
      {/* Full-bleed hero — one composition */}
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div
          aria-hidden
          className="t2p-hero-field absolute inset-0"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black"
        />
        <div
          aria-hidden
          className="t2p-hero-glow pointer-events-none absolute -left-1/4 top-1/4 h-[28rem] w-[28rem] rounded-full bg-brand/25 blur-3xl"
        />
        <div
          aria-hidden
          className="t2p-hero-glow-delayed pointer-events-none absolute -right-1/4 bottom-0 h-[22rem] w-[22rem] rounded-full bg-brand/15 blur-3xl"
        />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <Link href="/" className="inline-flex">
            <BrandLogo size="lg" variant="dark" subtitle={brand.tagline} />
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              render={<Link href="/login">Sign in</Link>}
            />
            <Button
              className="bg-brand text-white hover:bg-brand-hover"
              render={<Link href="/signup">Get started</Link>}
            />
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-5.5rem)] w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-10 sm:px-6 sm:pb-20 md:justify-center md:pb-24">
          <div className="t2p-fade-up max-w-2xl space-y-6">
            <Image
              src={brand.logo.full}
              alt={brand.name}
              width={280}
              height={280}
              className="h-24 w-auto object-contain drop-shadow-lg sm:h-32"
              priority
            />
            <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              {brand.tagline}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              The coach portal for youth athletes — rosters, film, velo, training,
              and pickup matching in one place.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="bg-brand px-8 text-base text-white hover:bg-brand-hover"
                render={<Link href="/signup">Create free coach account</Link>}
              />
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                render={<Link href="/login">Sign in</Link>}
              />
            </div>
            {showDemoCredentials() ? (
              <p className="text-sm text-white/50">
                Local demo — Coach: coach@example.com / password123 · Athlete:
                athlete@example.com / password123
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <main>
        <section className="border-t border-white/10 bg-zinc-950 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <p className="font-heading text-sm font-semibold tracking-[0.2em] text-brand uppercase">
                Built for the field
              </p>
              <h2 className="font-heading mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Everything a coach needs between practices
              </h2>
              <p className="mt-3 text-white/65">
                Less clipboard chaos. More clear plans, tracked progress, and film
                that actually teaches.
              </p>
            </div>

            <div className="mt-12 grid gap-10 sm:grid-cols-2">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="t2p-fade-up group border-l-2 border-brand/40 pl-5"
                  style={{ animationDelay: `${0.08 * (index + 1)}s` }}
                >
                  <feature.icon className="mb-3 h-7 w-7 text-brand transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="font-heading text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65 sm:text-base">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-brand px-4 py-16 text-black sm:px-6 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-black/15 to-transparent"
          />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Ready for your next session?
              </h2>
              <p className="mt-3 text-black/75">
                Sign up, set your zip and sport, and start adding athletes, film,
                and age-right drill suggestions in minutes.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-black text-white hover:bg-zinc-900"
              render={<Link href="/signup">Get started free</Link>}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-heading text-base font-semibold text-white">
              {brand.name}
            </p>
            <p className="text-brand">{brand.tagline}</p>
            <p className="mt-1">{brand.domain}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-brand">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-brand">
              Terms
            </Link>
            <a
              href={`mailto:${brand.supportEmail}`}
              className="hover:text-brand"
            >
              {brand.supportEmail}
            </a>
            <Link href="/login" className="hover:text-brand">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
