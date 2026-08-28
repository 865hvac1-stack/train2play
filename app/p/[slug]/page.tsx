import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { ShareablePlayerProfile } from "@/components/shareable-player-profile";
import { auth } from "@/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { brand } from "@/lib/brand";
import { getShareablePlayerProfile } from "@/lib/community/profile";
import { prisma } from "@/lib/db";
import type { ProfileViewer } from "@/lib/community/privacy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getShareablePlayerProfile(slug, { kind: "public" });
  if (result.status !== "ok") {
    return { title: `Player Profile | ${brand.name}` };
  }
  return {
    title: `${result.profile.identity.displayName} | ${brand.name} Player Profile`,
    description: [
      result.profile.identity.sport,
      result.profile.identity.ageGroup,
      result.profile.identity.location,
    ]
      .filter(Boolean)
      .join(" • "),
  };
}

export default async function PublicPlayerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  let viewer: ProfileViewer = { kind: "public" };
  if (session?.user?.id) {
    const me = await prisma.athleteProfile.findUnique({
      where: { userId: session.user.id },
      select: { publicSlug: true, id: true },
    });
    if (me?.publicSlug === slug) viewer = { kind: "self", userId: session.user.id };
    else if (session.user.role === "PLATFORM_ADMIN") viewer = { kind: "admin" };
    else {
      const orgs = await prisma.organizationMembership.findMany({
        where: { userId: session.user.id },
        select: { organizationId: true },
      });
      viewer =
        orgs.length > 0
          ? {
              kind: "organization",
              userId: session.user.id,
              organizationIds: orgs.map((row) => row.organizationId),
            }
          : { kind: "authenticated", userId: session.user.id, role: session.user.role };
    }
  }

  const result = await getShareablePlayerProfile(slug, viewer);
  if (result.status === "login_required") {
    redirect(`/login?callbackUrl=/p/${slug}`);
  }
  if (result.status !== "ok") notFound();
  const profile = result.profile;
  const shareUrl = `${getAppBaseUrl()}/p/${profile.slug}`;

  return (
    <div className="min-h-full bg-black text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/">
          <BrandLogo size="sm" variant="dark" subtitle={brand.tagline} />
        </Link>
        {profile.ownerPreview ? (
          <Link href="/athlete/profile" className="text-sm font-semibold text-brand">
            Back to my profile
          </Link>
        ) : (
          <Link href="/signup" className="text-sm font-semibold text-brand">
            Join Train2Play
          </Link>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <ShareablePlayerProfile profile={profile} shareUrl={shareUrl} />
      </main>
    </div>
  );
}
