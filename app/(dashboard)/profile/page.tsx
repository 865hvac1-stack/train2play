import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

import { CoachProfileHero } from "@/components/coach-profile-view";
import { DashboardShell } from "@/components/dashboard-shell";
import { ShareProfileControls } from "@/components/share-profile-controls";
import { formatDiscoveryStatus, formatBackgroundCheckStatus } from "@/lib/coaching/status";
import { coachProfileCompletion, ensureCoachPublicSlug, getCoachProfileByUserId } from "@/lib/coaching/profile";
import { isCoachAcceptingAthletes } from "@/lib/coaching/discovery";
import { getAppBaseUrl } from "@/lib/app-url";
import { requireCoach } from "@/lib/session";
import { isTrainer } from "@/lib/roles";
import { isBackgroundCheckPublicBadge, isTrain2PlayApproved } from "@/lib/coaching/status";
import { redirect } from "next/navigation";

export default async function CoachMyProfilePage() {
  const coach = await requireCoach();
  if (isTrainer(coach.role)) redirect("/trainer");
  const profile = await getCoachProfileByUserId(coach.id);
  const slug = await ensureCoachPublicSlug(profile);
  const accepting = await isCoachAcceptingAthletes(profile);
  const completion = coachProfileCompletion(profile);
  const shareUrl = `${getAppBaseUrl()}/coach/${slug}`;
  const specialties = [...new Set(profile.sports.flatMap((row) => row.specialties))];
  const primary = profile.sports.find((row) => row.isPrimary) ?? profile.sports[0];

  return (
    <DashboardShell
      title="My Coach Profile"
      description="Your professional Train2Play identity. Discovery requires Admin approval."
    >
      <div className="space-y-6">
        <CoachProfileHero
          displayName={profile.displayName?.trim() || coach.name}
          sport={primary?.sport ?? null}
          specialties={specialties}
          organizationName={profile.organizationName}
          locationLabel={profile.locationLabel}
          avatarUrl={profile.avatarUrl}
          coverImageUrl={profile.coverImageUrl}
          approved={isTrain2PlayApproved(profile.discoveryStatus)}
          backgroundCheckCompleted={isBackgroundCheckPublicBadge({
            status: profile.backgroundCheckStatus,
            expiresAt: profile.backgroundCheckExpiresAt,
          })}
          remote={profile.remoteCoaching}
          inPerson={profile.inPersonCoaching}
          accepting={accepting}
          actions={
            <>
              {profile.discoveryStatus === "APPROVED" ? (
                <Link
                  href={`/coach/${slug}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/20 px-4 text-sm font-semibold"
                >
                  <Eye className="size-4" />
                  View public profile
                </Link>
              ) : null}
              <Link
                href="/dashboard/profile/edit"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-black"
              >
                <Pencil className="size-4" />
                Edit profile
              </Link>
              {profile.discoveryStatus === "APPROVED" ? (
                <ShareProfileControls
                  url={shareUrl}
                  title={`${profile.displayName || coach.name} | Train2Play Coach`}
                  text="Check out my Train2Play Coach Profile."
                />
              ) : null}
            </>
          }
        />

        <section className="rounded-2xl border border-white/10 bg-white p-4 text-slate-800">
          <p className="text-sm font-semibold">Profile {completion.percent}% complete</p>
          <p className="mt-1 text-sm text-slate-600">
            Status: {formatDiscoveryStatus(profile.discoveryStatus)} · Background check:{" "}
            {formatBackgroundCheckStatus(profile.backgroundCheckStatus)}
          </p>
          {profile.requestChangesNote ? (
            <p className="mt-2 text-sm text-amber-700">Admin requested: {profile.requestChangesNote}</p>
          ) : null}
          {completion.missing.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {completion.missing.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-10 items-center rounded-full border border-brand/40 bg-brand/10 px-3 text-[11px] font-semibold text-brand uppercase"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}
