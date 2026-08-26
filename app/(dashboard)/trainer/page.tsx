import Link from "next/link";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  CircleGauge,
  Dumbbell,
  Film,
  Plus,
  Users,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBaseballProgramHealth } from "@/lib/director-dashboard";
import { requireLibraryEditor } from "@/lib/session";

function HealthCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl border border-brand/50 bg-brand p-5 text-black shadow-[0_18px_40px_-28px_rgba(255,102,0,0.9)]"
          : "rounded-2xl border border-slate-200 bg-white p-5"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-xs font-bold tracking-[0.14em] uppercase ${
            accent ? "text-black/70" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <Icon
          className={`size-5 ${accent ? "text-black/70" : "text-brand"}`}
        />
      </div>
      <p className="font-heading mt-4 text-4xl font-bold">{value}</p>
      <p
        className={`mt-1 text-xs ${accent ? "text-black/70" : "text-slate-500"}`}
      >
        {detail}
      </p>
    </div>
  );
}

function RateBar({
  label,
  count,
  total,
  rate,
}: {
  label: string;
  count: number;
  total: number;
  rate: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{label}</p>
          <p className="text-xs text-slate-500">
            {count} of {total} Baseball athletes
          </p>
        </div>
        <p className="font-heading text-2xl font-bold text-brand">{rate}%</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

export default async function DirectorHomePage() {
  const user = await requireLibraryEditor();
  const health = await getBaseballProgramHealth();
  const { totals } = health;

  return (
    <DashboardShell
      title="Baseball program command center"
      description="Program-wide enrollment, coach activation, athlete engagement, and content controls."
      action={
        <Button
          nativeButton={false}
          render={
            <Link href="/trainer/drills?sport=Baseball">
              <Plus className="size-4" />
              Suggested drill
            </Link>
          }
        />
      }
    >
      <section className="overflow-hidden rounded-3xl bg-zinc-950 p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
              Director view · Baseball
            </p>
            <h2 className="font-heading mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              The health of the whole program, in one place.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              See whether coaches are creating, players are engaging, and
              training is getting completed—then adjust the content every coach
              and athlete receives.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              render={<Link href="/library?sport=Baseball">Content library</Link>}
            />
            <Button
              nativeButton={false}
              render={<Link href="/library/new">Build a course</Link>}
            />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <HealthCard
          label="Baseball enrollment"
          value={String(totals.athletes)}
          detail="Every athlete with Baseball selected on their profile"
          icon={Users}
          accent
        />
        <HealthCard
          label="Active players"
          value={`${totals.activeAthleteRate}%`}
          detail={`${totals.activeAthletes} completed training in the last 30 days`}
          icon={Activity}
        />
        <HealthCard
          label="Video reach"
          value={`${totals.videoViewRate}%`}
          detail={`${totals.videoViewers} players started a published Baseball video`}
          icon={Film}
        />
        <HealthCard
          label="Course completion"
          value={`${totals.courseCompletionRate}%`}
          detail={`${totals.courseCompleters} players completed at least one course`}
          icon={CheckCircle2}
        />
        <HealthCard
          label="Coach participation"
          value={`${totals.coachContributionRate}%`}
          detail={`${totals.contributingCoaches} of ${totals.coaches} connected coaches pushed video in 30 days`}
          icon={CircleGauge}
        />
        <HealthCard
          label="Training output"
          value={String(totals.completedWorkouts)}
          detail="Baseball workouts completed in the last 30 days"
          icon={Dumbbell}
        />
      </section>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Player funnel
              </p>
              <h2 className="font-heading mt-1 text-2xl font-bold">
                From enrolled to engaged
              </h2>
            </div>
            <Badge variant="secondary">Live</Badge>
          </div>
          <div className="mt-6 space-y-6">
            <RateBar
              label="Enrolled in Baseball"
              count={totals.athletes}
              total={totals.athletes}
              rate={totals.athletes > 0 ? 100 : 0}
            />
            <RateBar
              label="Active this month"
              count={totals.activeAthletes}
              total={totals.athletes}
              rate={totals.activeAthleteRate}
            />
            <RateBar
              label="Watched program video"
              count={totals.videoViewers}
              total={totals.athletes}
              rate={totals.videoViewRate}
            />
            <RateBar
              label="Completed a course"
              count={totals.courseCompleters}
              total={totals.athletes}
              rate={totals.courseCompletionRate}
            />
          </div>
          <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            Video and course engagement begins recording with this release.
            Percentages use all athletes who selected Baseball, including
            multi-sport athletes.
          </p>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Content performance
              </p>
              <h2 className="font-heading mt-1 text-2xl font-bold">
                Courses players receive
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/library?sport=Baseball">Manage all</Link>}
            />
          </div>
          {health.courseHealth.length > 0 ? (
            <div className="mt-4 space-y-3">
              {health.courseHealth.map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {course.itemCount} item{course.itemCount === 1 ? "" : "s"}{" "}
                        · {course.videoCount} video
                        {course.videoCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/courses/${course.id}`}>Control</Link>}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Video reach</p>
                      <p className="font-heading text-xl font-bold">
                        {course.viewRate}%
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {course.viewerCount} players
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Completed</p>
                      <p className="font-heading text-xl font-bold">
                        {course.completionRate}%
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {course.completionCount} players
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <BookOpen className="mx-auto size-6 text-brand" />
              <p className="mt-2 font-semibold">No Baseball courses published</p>
              <p className="mt-1 text-sm text-slate-500">
                Build and publish the first course to begin measuring reach.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Player scorecards
            </p>
            <h2 className="font-heading mt-1 text-2xl font-bold">
              Every Baseball athlete
            </h2>
          </div>
          <Badge variant="secondary">{totals.athletes} enrolled</Badge>
        </div>
        {health.athletes.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
                  <th className="px-3 py-3 font-semibold">Player</th>
                  <th className="px-3 py-3 font-semibold">Profile</th>
                  <th className="px-3 py-3 font-semibold">Coaches</th>
                  <th className="px-3 py-3 font-semibold">30-day training</th>
                  <th className="px-3 py-3 font-semibold">Video</th>
                  <th className="px-3 py-3 font-semibold">Course</th>
                </tr>
              </thead>
              <tbody>
                {health.athletes.map((athlete) => (
                  <tr key={athlete.id} className="border-b border-slate-100">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-950">
                        {athlete.firstName} {athlete.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{athlete.ageBand}</p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-1">
                        {athlete.sports.map((sport) => (
                          <Badge
                            key={sport.id}
                            variant={sport.primary ? "default" : "outline"}
                          >
                            {sport.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4">{athlete.coachCount}</td>
                    <td className="px-3 py-4">
                      <Badge
                        variant={
                          athlete.activeThisMonth ? "default" : "secondary"
                        }
                      >
                        {athlete.activeThisMonth ? "Active" : "No activity"}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      <Badge
                        variant={athlete.watchedVideo ? "default" : "secondary"}
                      >
                        {athlete.watchedVideo ? "Watched" : "Not yet"}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      <Badge
                        variant={
                          athlete.completedCourse ? "default" : "secondary"
                        }
                      >
                        {athlete.completedCourse ? "Completed" : "In progress"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Players appear here as soon as Baseball is selected on their
            profile.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Program controls
            </p>
            <h2 className="font-heading mt-1 text-2xl font-bold">
              Suggested Baseball drills
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These recommendations feed the player and coach experiences. Edit
              one here and it changes everywhere.
            </p>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href="/trainer/drills?sport=Baseball">
                Add or reorder drills
              </Link>
            }
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {health.drills.slice(0, 6).map((drill) => (
            <div
              key={drill.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline">{drill.ageBand}</Badge>
                  <h3 className="mt-2 font-semibold text-slate-950">
                    {drill.title}
                  </h3>
                  <p className="text-sm text-brand">{drill.focus}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/trainer/drills?sport=Baseball&edit=${drill.id}`}
                    >
                      Edit
                    </Link>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-5 text-xs text-slate-500">
        Director access: {user.email} · Updated{" "}
        {new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(health.generatedAt)}
      </p>
    </DashboardShell>
  );
}
