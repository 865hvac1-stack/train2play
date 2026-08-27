import Link from "next/link";

import { BrandLogoLarge } from "@/components/brand-logo";
import { brand } from "@/lib/brand";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="text-sm text-slate-500">Last updated: August 27, 2026</p>

        <p>
          By creating an account or using {brand.name} at {brand.domain}, you agree to these terms.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">The service</h2>
          <p>
            {brand.name} provides tools for coaches to manage athletes, training plans, video
            coaching notes, player profiles, and pickup-player matching. Features may change as we
            improve the product.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Your account</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You must provide accurate account information and keep your password secure</li>
            <li>You are responsible for activity under your account</li>
            <li>You must be authorized to manage the athlete information you enter</li>
            <li>
              A parent or legal guardian creating a minor&apos;s profile
              confirms they are authorized to consent for that child
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Acceptable use</h2>
          <p>
            Do not misuse the service, upload unlawful content, attempt unauthorized access, spam
            other coaches, or use pickup matching for anything other than legitimate coaching and
            team needs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Content you upload</h2>
          <p>
            You retain rights to content you upload (including film). You grant us a license to host
            and display that content as needed to operate the service. Do not upload content you do
            not have rights to share.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Minor athletes and public sharing
          </h2>
          <p>
            Public video showcases and public leaderboards, if offered, require
            separate permission. Those choices are off by default and are not
            required for private coaching. Giving permission does not guarantee
            publication, and permission may be withdrawn for future use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Disclaimer</h2>
          <p>
            The service is provided &quot;as is.&quot; Training advice and video notes are tools for
            coaches — they are not medical advice. We are not liable for decisions made based on
            metrics, matches, or coaching notes in the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Termination</h2>
          <p>
            We may suspend accounts that violate these terms. You may stop using the service at any
            time and request deletion by contacting{" "}
            <a className="text-primary hover:underline" href={`mailto:${brand.supportEmail}`}>
              {brand.supportEmail}
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <p>
            <a className="text-primary hover:underline" href={`mailto:${brand.supportEmail}`}>
              {brand.supportEmail}
            </a>
          </p>
        </section>

        <p className="pt-4 text-sm">
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </main>
    </div>
  );
}
