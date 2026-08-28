import Link from "next/link";
import Image from "next/image";
import {
  ChartNoAxesCombined,
  Dumbbell,
  Link2,
  UserRound,
} from "lucide-react";

import { HomepageCommunitySections } from "@/components/homepage-community-sections";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { brand } from "@/lib/brand";
import { showDemoCredentials } from "@/lib/env";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

const features = [
  {
    icon: Dumbbell,
    title: "Personalized training",
    body: "Follow structured programs and workouts built around the athlete's sport, goals, age, and development.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Track real progress",
    body: "Record performance metrics, monitor improvement, celebrate personal records, and see development over time.",
  },
  {
    icon: Link2,
    title: "Coach connected",
    body: "Coaches can assign training, review results, provide feedback, and help athletes stay on track.",
  },
  {
    icon: UserRound,
    title: "One athlete profile",
    body: "Training, metrics, videos, achievements, goals, and development history — connected to one athlete.",
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
        <div aria-hidden className="t2p-hero-field absolute inset-0" />
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
          <div className="t2p-fade-up max-w-2xl space-y-5 sm:space-y-6">
            <Image
              src={brand.logo.full}
              alt={brand.name}
              width={280}
              height={280}
              className="h-24 w-auto object-contain drop-shadow-lg sm:h-32"
              priority
            />
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase sm:text-sm">
              {brand.heroBadge}
            </p>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              {brand.tagline}
            </h1>
            <div className="max-w-xl space-y-3">
              <p className="text-lg font-semibold text-white sm:text-xl">
                {brand.positioning}
              </p>
              <p className="text-base leading-relaxed text-white/75 sm:text-lg">
                {brand.heroSupport}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="bg-brand px-8 text-base font-semibold tracking-wide text-white hover:bg-brand-hover"
                render={<Link href="/signup">Get started</Link>}
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
            <div className="max-w-2xl">
              <p className="font-heading text-sm font-semibold tracking-[0.2em] text-brand uppercase">
                Built around the athlete
              </p>
              <h2 className="font-heading mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Everything your athlete needs to get better
              </h2>
              <p className="mt-3 text-white/65">
                Training, progress, coaching, and performance — connected in one
                athlete development platform.
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

            <p className="mt-12 max-w-2xl text-sm text-white/45">
              Built for youth athletes across sports — from the field and court to
              the gym — with parents and coaches connected around one long-term
              profile.
            </p>
          </div>
        </section>

        <HomepageCommunitySections />

        <section className="relative overflow-hidden bg-brand px-4 py-16 text-black sm:px-6 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-black/15 to-transparent"
          />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to get better?
              </h2>
              <p className="mt-3 text-black/75">
                Start building your athlete&apos;s training, progress, and
                development journey with Train2Play.
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
            <p className="mt-1 text-white/45">{brand.subtagline}</p>
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
            <Link href="/signup" className="hover:text-brand">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
