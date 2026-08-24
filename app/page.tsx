import Link from "next/link";
import Image from "next/image";
import { Crosshair, MapPin, Users, Video } from "lucide-react";

import { BrandLogoLarge } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { brand } from "@/lib/brand";
import { showDemoCredentials } from "@/lib/env";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

const features = [
  {
    icon: Users,
    title: "Rosters & plans",
    body: "Manage athletes, training plans, workouts, and family share links in one place.",
  },
  {
    icon: Crosshair,
    title: "Velo profiles",
    body: "Track throwing velo, bat speed, and exit velo against system averages.",
  },
  {
    icon: Video,
    title: "Film coaching",
    body: "Upload clips, draw on frames, and leave timestamped coaching notes.",
  },
  {
    icon: MapPin,
    title: "Pickup matching",
    body: "List pickup players by zip and get alerts when coaches nearby need coverage.",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompletedAt: true },
    });

    redirect(user?.onboardingCompletedAt ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="min-h-full max-w-[100vw] overflow-x-hidden t2p-page-gradient">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <BrandLogoLarge />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="ghost" render={<Link href="/login">Sign in</Link>} />
          <Button render={<Link href="/signup">Get started</Link>} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-16 pt-8 sm:gap-20 sm:px-6 md:pt-16">
        <section className="mx-auto max-w-3xl space-y-6 text-center">
          <div className="flex justify-center">
            <Image
              src={brand.logo.full}
              alt={brand.name}
              width={320}
              height={320}
              className="h-40 w-auto object-contain sm:h-52"
              priority
            />
          </div>
          <p className="inline-flex rounded-full bg-brand-light px-3 py-1 text-sm font-medium text-brand">
            {brand.heroBadge}
          </p>
          <p className="text-xl font-semibold tracking-wide text-brand md:text-2xl">
            {brand.tagline}
          </p>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600">
            {brand.description}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/signup">Create free coach account</Link>} />
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/login">Sign in</Link>}
            />
          </div>
          {showDemoCredentials() ? (
            <p className="text-sm text-slate-500">
              Local demo: coach@example.com / password123
            </p>
          ) : null}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-brand/20 bg-white/80 p-6 shadow-sm"
            >
              <feature.icon className="mb-4 h-8 w-8 text-brand" />
              <h2 className="text-lg font-semibold text-slate-900">{feature.title}</h2>
              <p className="mt-2 text-slate-600">{feature.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-black px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-bold">Ready for your next session?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Sign up, set your zip, and start adding athletes, film, and pickup players in minutes.
          </p>
          <div className="mt-6">
            <Button size="lg" render={<Link href="/signup">Get started free</Link>} />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">{brand.name}</p>
            <p>{brand.domain}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-brand">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-brand">
              Terms
            </Link>
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-brand">
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
