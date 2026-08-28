import { CoachProfileEditForm } from "@/components/coach-profile-edit-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { isCoachEditSection } from "@/lib/coaching/status";
import { coachProfileCompletion, getCoachProfileByUserId } from "@/lib/coaching/profile";
import { requireCoach } from "@/lib/session";
import { isTrainer } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function EditCoachProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const coach = await requireCoach();
  if (isTrainer(coach.role)) redirect("/trainer");
  const { section } = await searchParams;
  const profile = await getCoachProfileByUserId(coach.id);
  const completion = coachProfileCompletion(profile);
  const initialSection = isCoachEditSection(section) ? section : "profile";

  return (
    <DashboardShell
      title="Edit Coach Profile"
      description="Build the profile Admin will review for Find a Coach."
    >
      <div className="rounded-2xl bg-zinc-950 p-4 text-white sm:p-6">
        <CoachProfileEditForm
          profile={profile}
          initialSection={initialSection}
          completion={completion}
        />
      </div>
    </DashboardShell>
  );
}
