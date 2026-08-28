import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { CoachProfileHero, CoachPublicBody } from "@/components/coach-profile-view";
import { RequestCoachForm } from "@/components/request-coach-form";
import { auth } from "@/auth";
import { brand } from "@/lib/brand";
import { getPublicCoachProfile } from "@/lib/coaching/profile";
import { ACTIVE_REQUEST_STATUSES, CONNECTION_STATUS } from "@/lib/coach-connections";
import { prisma } from "@/lib/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicCoachProfile(slug);
  if (result.status !== "ok") {
    return { title: `Coach Profile | ${brand.name}` };
  }
  return {
    title: `${result.profile.displayName} | ${brand.name} Coach`,
    description: [result.profile.sport, result.profile.locationLabel].filter(Boolean).join(" • "),
  };
}

export default async function PublicCoachProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicCoachProfile(slug);
  if (result.status !== "ok") notFound();
  const profile = result.profile;

  const session = await auth();
  let requestStatus: "none" | "pending" | "connected" | "not-accepting" = profile.accepting
    ? "none"
    : "not-accepting";
  if (session?.user?.id) {
    const athlete = await prisma.athleteProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (athlete) {
      const row = await prisma.coachAthleteConnection.findFirst({
        where: { athleteProfileId: athlete.id, coachUserId: profile.userId },
        select: { status: true },
      });
      if (row?.status === CONNECTION_STATUS.APPROVED) requestStatus = "connected";
      else if (row && (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(row.status)) {
        requestStatus = "pending";
      }
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <Link href="/" className="inline-flex">
          <BrandLogo variant="dark" />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <CoachProfileHero
          displayName={profile.displayName}
          sport={profile.sport}
          specialties={profile.specialties}
          organizationName={profile.organizationName}
          locationLabel={profile.locationLabel}
          avatarUrl={profile.avatarUrl}
          coverImageUrl={profile.coverImageUrl}
          approved={profile.approved}
          backgroundCheckCompleted={profile.backgroundCheckCompleted}
          remote={profile.remote}
          inPerson={profile.inPerson}
          accepting={profile.accepting}
        />
        <CoachPublicBody
          bio={profile.bio}
          experienceText={profile.experienceText}
          certifications={profile.certifications}
          yearsCoaching={profile.yearsCoaching}
          sports={profile.sports.map((row) => row.sport)}
          positions={profile.positions}
          ageGroups={profile.ageGroups}
          featuredVideo={profile.featuredVideo}
          videos={profile.videos}
          socials={profile.socials}
          website={profile.website}
          shareUrl={profile.shareUrl}
          displayName={profile.displayName}
        />
        {session?.user?.role === "ATHLETE" ? (
          <RequestCoachForm
            coachUserId={profile.userId}
            specialty={profile.specialties[0]}
            status={requestStatus}
          />
        ) : (
          <Link
            href={`/login?callbackUrl=/coach/${slug}`}
            className="flex min-h-12 items-center justify-center rounded-2xl bg-brand text-sm font-bold text-black"
          >
            Sign in to request this coach
          </Link>
        )}
      </main>
    </div>
  );
}
