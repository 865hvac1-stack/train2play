import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { lookupCoachByConnectionCode } from "@/lib/coach-connections";
import { brand } from "@/lib/brand";
import { auth } from "@/auth";
import { isAthleteRole } from "@/lib/roles";

/** QR / shareable connect entrypoint → athlete connect flow. */
export default async function PublicConnectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const preview = await lookupCoachByConnectionCode(raw);
  if (!preview) notFound();

  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/connect/${preview.code}`)}`,
    );
  }

  if (!isAthleteRole(session.user.role)) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-4 py-12">
        <BrandLogo size="lg" subtitle={brand.tagline} />
        <h1 className="font-heading text-2xl font-bold">
          Athlete login required
        </h1>
        <p className="text-sm text-slate-600">
          Sign in with an athlete account to request a connection with{" "}
          <strong>{preview.name}</strong>.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary">
          Sign in
        </Link>
      </div>
    );
  }

  redirect(`/athlete/connect?code=${encodeURIComponent(preview.code)}`);
}
