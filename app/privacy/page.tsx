import Link from "next/link";

import { BrandLogoLarge } from "@/components/brand-logo";
import { brand } from "@/lib/brand";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full t2p-page-gradient">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <BrandLogoLarge />
          </Link>
          <Link href="/signup" className="text-sm font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-slate-700">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="text-sm text-slate-500">Last updated: August 27, 2026</p>

        <p>
          {brand.name} (&quot;we&quot;, &quot;us&quot;) provides coaching tools for youth sports
          programs. This policy explains what information we collect and how we use it.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Information we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Coach account details: name, email, password (hashed), and zip code preferences</li>
            <li>
              Athlete information you enter: name, sport, position, date of birth, performance
              metrics, notes, and optional location for pickup matching
            </li>
            <li>Training plans, workouts, video files you upload, and coaching annotations</li>
            <li>
              Parent or guardian contact details supplied for a minor athlete
            </li>
            <li>Parent email addresses when you create family share links</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">How we use information</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To operate the coach portal and deliver features you request</li>
            <li>To match pickup players with nearby coaches when you opt in</li>
            <li>To send transactional emails (password resets, pickup alerts, parent invites)</li>
            <li>To maintain security and improve reliability</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Sharing</h2>
          <p>
            We do not sell personal information. Family share links show a read-only athlete view to
            anyone with the link. Coaches control when links are created or revoked. Pickup listings
            are visible to other coaches within the search filters you configure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Youth data</h2>
          <p>
            Athlete profiles may include information about minors. A parent or
            legal guardian must authorize a minor&apos;s self-service profile.
            We record that authorization with the policy version and the
            guardian identity supplied at signup. Coaches and organizations are
            responsible for having authority to add athletes they manage.
            Contact us to review or remove a child&apos;s information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Videos and future leaderboards
          </h2>
          <p>
            Training videos are private to authorized accounts and explicitly
            shared recipients. Permission for a future public video showcase is
            a separate, optional choice that is off by default. Permission for
            future public leaderboards is also separate and off by default.
            Private coaching features do not require either public-sharing
            choice.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Data retention &amp; security</h2>
          <p>
            We store data on hosted infrastructure with industry-standard access controls. You may
            request account deletion by emailing{" "}
            <a className="text-primary hover:underline" href={`mailto:${brand.supportEmail}`}>
              {brand.supportEmail}
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <p>
            Questions about privacy:{" "}
            <a className="text-primary hover:underline" href={`mailto:${brand.supportEmail}`}>
              {brand.supportEmail}
            </a>
          </p>
        </section>

        <p className="pt-4 text-sm">
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
        </p>
      </main>
    </div>
  );
}
