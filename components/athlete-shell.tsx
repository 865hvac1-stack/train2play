import Link from "next/link";

import { AthleteBottomNav, AthleteDesktopNav } from "@/components/athlete-bottom-nav";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { brand } from "@/lib/brand";

export function AthleteShell({
  firstName,
  children,
}: {
  firstName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full min-w-0 overflow-x-hidden bg-zinc-950 text-white">
      <AthleteDesktopNav />
      <div className="flex min-h-full min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="safe-area-pt safe-area-px sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-md md:px-6">
          <Link href="/athlete" className="md:hidden">
            <BrandLogo size="sm" variant="dark" showText={false} />
          </Link>
          <div className="min-w-0 flex-1 md:pl-0">
            <p className="truncate text-xs font-semibold tracking-[0.16em] text-brand uppercase">
              {brand.tagline}
            </p>
            <p className="font-heading truncate text-lg font-bold tracking-tight text-white">
              Hey, {firstName}
            </p>
          </div>
          <SignOutButton />
        </header>
        <main className="safe-area-px mx-auto w-full max-w-3xl min-w-0 flex-1 overflow-x-hidden px-4 pb-28 pt-5 sm:px-6 md:pb-10">
          {children}
        </main>
        <AthleteBottomNav />
      </div>
    </div>
  );
}
