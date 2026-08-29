import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { brand } from "@/lib/brand";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-black px-6 py-16 text-center text-white">
      <BrandLogo size="lg" variant="dark" subtitle={brand.subtagline} />
      <h1 className="font-heading mt-8 text-3xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        Train2Play needs a connection to load your training, film, and progress.
        Reconnect and try again.
      </p>
      <Link
        href="/launch"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black"
      >
        Try again
      </Link>
    </div>
  );
}
