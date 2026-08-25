import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { SignupForm } from "@/components/auth-forms";
import { brand } from "@/lib/brand";

export default function SignupPage() {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-black px-4 py-12">
      <div aria-hidden className="t2p-hero-field absolute inset-0 opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black"
      />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <BrandLogo size="lg" variant="dark" subtitle={brand.tagline} />
        </Link>
        <SignupForm />
      </div>
    </div>
  );
}
