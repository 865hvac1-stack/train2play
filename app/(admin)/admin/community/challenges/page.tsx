import { AdminShell } from "@/components/admin-shell";
import { saveChallengeForm } from "@/app/(admin)/admin/community-actions";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/session";

export default async function AdminChallengesPage() {
  await requirePlatformAdmin();
  const challenges = await prisma.challenge.findMany({
    orderBy: { startAt: "desc" },
    take: 30,
  });

  return (
    <AdminShell
      title="Challenges"
      description="One reusable challenge system. Scoring can be training days, workouts, PRs, or metric improvement."
    >
      <form action={saveChallengeForm} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <input name="name" required placeholder="Challenge name" className="h-10 w-full rounded-lg border px-2" />
        <textarea name="description" required placeholder="Description" className="min-h-20 w-full rounded-lg border px-2 py-2" />
        <input name="sport" placeholder="Sport (optional)" className="h-10 w-full rounded-lg border px-2" />
        <select name="scoringType" className="h-10 w-full rounded-lg border px-2">
          <option value="TRAINING_DAYS">Training days</option>
          <option value="WORKOUT_COUNT">Workout count</option>
          <option value="PROGRAM_COMPLETION">Program completion</option>
          <option value="SPECIFIC_WORKOUT">Specific workout</option>
          <option value="PR_ACHIEVEMENT">PR achievement</option>
          <option value="METRIC_IMPROVEMENT">Metric improvement</option>
        </select>
        <input name="targetValue" type="number" defaultValue={5} className="h-10 w-full rounded-lg border px-2" />
        <input name="workoutTitle" placeholder="Specific workout title (optional)" className="h-10 w-full rounded-lg border px-2" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="datetime-local" name="startAt" required className="h-10 rounded-lg border px-2" />
          <input type="datetime-local" name="endAt" required className="h-10 rounded-lg border px-2" />
        </div>
        <select name="status" className="h-10 w-full rounded-lg border px-2">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived (crown winner)</option>
        </select>
        <Button type="submit">Save challenge</Button>
      </form>

      <ul className="mt-6 space-y-2">
        {challenges.map((challenge) => (
          <li key={challenge.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold">{challenge.name}</p>
            <p className="text-sm text-slate-500">
              {challenge.status} · {challenge.scoringType} · target {challenge.targetValue}
            </p>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
