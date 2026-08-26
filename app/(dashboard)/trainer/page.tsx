import Link from "next/link";
import {
  Activity,
  AlertTriangle,
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
import { CATALOG_SPORTS } from "@/lib/catalog-drills";
import { prisma } from "@/lib/db";
import { getSportProgramHealth } from "@/lib/director-dashboard";
import { requireLibraryEditor } from "@/lib/session";

function HealthCard({
  label,
  value,
  detail,
  href,
  action,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  action: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        accent
          ? "group rounded-2xl border border-brand/50 bg-brand p-5 text-black shadow-[0_18px_40px_-28px_rgba(255,102,0,0.9)] transition hover:-translate-y-0.5 hover:shadow-lg"
          : "group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
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
      <p
        className={`mt-3 text-[11px] font-bold tracking-wide uppercase ${
          accent ? "text-black/70" : "text-brand"
        }`}
      >
        {action} <span className="inline-block transition group-hover:translate-x-1">→</span>
      </p>
    </Link>
  );
}

function AttentionCard({
  title,
  detail,
  href,
  action,
  icon: Icon,
}: {
  title: string;
  detail: string;
  href: string;
  action: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-[0.14em] text-amber-900 uppercase">
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-700">{detail}</p>
          <Link
            href={href}
            className="mt-3 inline-flex text-xs font-bold tracking-wide text-brand uppercase hover:underline"
          >
            {action} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function RateBar({
  label,
  count,
  total,
  rate,
  sport,
}: {
  label: string;
  count: number;
  total: number;
  rate: number;
  sport: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{label}</p>
          <p className="text-xs text-slate-500">
            {count} of {total} {sport} athletes
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

export default async function DirectorHomePage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; attention?: string; view?: string }>;
}) {
  const user = await requireLibraryEditor();
  const [
    { sport: requestedSport, attention, view },
    director,
  ] = await Promise.all([
      searchParams,
      prisma.user.findUnique({
        where: { id: user.id },
        select: { lookingForSport: true },
      }),
    ]);
  const sport =
    CATALOG_SPORTS.find((item) => item === requestedSport) ??
    CATALOG_SPORTS.find((item) => item === director?.lookingForSport) ??
    "Baseball";
  const sportQuery = `sport=${encodeURIComponent(sport)}`;
  const health = await getSportProgramHealth(sport);
  const { totals } = health;
  const attentionHref = (filter: string, anchor: string) =>
    `/trainer?${sportQuery}&attention=${filter}#${anchor}`;
  const viewHref = (filter: string, anchor: string) =>
    `/trainer?${sportQuery}&view=${filter}#${anchor}`;
  const attentionCards = [
    health.attention.athletesNotTraining > 0
      ? {
          title: "Athletes not training",
          detail: `${health.attention.athletesNotTraining} athlete${health.attention.athletesNotTraining === 1 ? " hasn't" : "s haven't"} completed training in 14+ days`,
          href: attentionHref("no-training", "player-scorecards"),
          action: "View athletes",
          icon: Activity,
        }
      : null,
    health.attention.athletesWithoutCoaches > 0
      ? {
          title: "Athletes without coaches",
          detail: `${health.attention.athletesWithoutCoaches} athlete${health.attention.athletesWithoutCoaches === 1 ? " isn't" : "s aren't"} connected to a coach`,
          href: attentionHref("no-coach", "player-scorecards"),
          action: "View athletes",
          icon: Users,
        }
      : null,
    health.attention.waitingVideoReviews > 0
      ? {
          title: "Video reviews waiting",
          detail: `${health.attention.waitingVideoReviews} athlete video${health.attention.waitingVideoReviews === 1 ? " is" : "s are"} awaiting coach review`,
          href: attentionHref("reviews", "attention-details"),
          action: "View reviews",
          icon: Film,
        }
      : null,
    health.attention.inactiveCoaches > 0
      ? {
          title: "Inactive coaches",
          detail: `${health.attention.inactiveCoaches} coach${health.attention.inactiveCoaches === 1 ? " hasn't" : "es haven't"} assigned training in 30 days`,
          href: attentionHref("inactive-coaches", "attention-details"),
          action: "View coaches",
          icon: CircleGauge,
        }
      : null,
    health.attention.incompleteCourses > 0
      ? {
          title: "Incomplete courses",
          detail: `${health.attention.incompleteCourses} athlete${health.attention.incompleteCourses === 1 ? " started" : "s started"} a course but haven't completed it`,
          href: attentionHref("incomplete-courses", "player-scorecards"),
          action: "View athletes",
          icon: BookOpen,
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => card !== null);
  const filteredAthletes =
    attention === "no-training"
      ? health.athletes.filter((athlete) => athlete.needsTraining)
      : attention === "no-coach"
        ? health.athletes.filter((athlete) => athlete.coachCount === 0)
        : attention === "incomplete-courses"
          ? health.athletes.filter((athlete) => athlete.incompleteCourse)
          : view === "active"
            ? health.athletes.filter((athlete) => athlete.activeThisMonth)
            : view === "video"
              ? health.athletes.filter((athlete) => athlete.watchedVideo)
              : view === "completed"
                ? health.athletes.filter((athlete) => athlete.completedCourse)
                : health.athletes;

  return (
    <DashboardShell
      title={`${sport} program command center`}
      description="Program-wide enrollment, coach activation, athlete engagement, and content controls."
      action={
        <Button
          nativeButton={false}
          render={
            <Link href={`/trainer/drills?${sportQuery}`}>
              <Plus className="size-4" />
              Suggested drill
            </Link>
          }
        />
      }
    >
      <div className="mx-auto w-full max-w-[1440px]">
      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Director sport">
        {CATALOG_SPORTS.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={item === sport ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={`/trainer?sport=${encodeURIComponent(item)}`}>{item}</Link>}
          />
        ))}
      </nav>
      <section className="overflow-hidden rounded-3xl bg-zinc-950 p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
              Director view · {sport}
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
              render={<Link href={`/library?${sportQuery}`}>Content library</Link>}
            />
            <Button
              nativeButton={false}
              render={<Link href="/library/new">Build a course</Link>}
            />
          </div>
        </div>
      </section>

      {attentionCards.length > 0 ? (
        <section className="mt-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-700" />
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-amber-800 uppercase">
                Needs attention
              </p>
              <p className="text-sm text-slate-600">
                Real operational issues requiring Director action.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attentionCards.map((card) => (
              <AttentionCard key={card.title} {...card} />
            ))}
          </div>
        </section>
      ) : null}

      {attention === "reviews" && health.waitingVideoReviews.length > 0 ? (
        <section
          id="attention-details"
          className="mt-5 scroll-mt-24 rounded-2xl border border-amber-300 bg-white p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-amber-800 uppercase">
                Waiting review queue
              </p>
              <h2 className="font-heading mt-1 text-2xl font-bold">
                {sport} videos awaiting coaches
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/trainer?${sportQuery}`}>Clear view</Link>}
            />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {health.waitingVideoReviews.map((review) => (
              <div
                key={review.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-950">{review.title}</p>
                  <p className="text-xs text-slate-500">
                    {review.athleteProfile.firstName}{" "}
                    {review.athleteProfile.lastName} · {review.category}
                  </p>
                </div>
                <div className="text-xs text-slate-500 sm:text-right">
                  <p>Coach: {review.coachUser.name}</p>
                  <p>
                    Waiting since{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(review.submittedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {attention === "inactive-coaches" && health.inactiveCoaches.length > 0 ? (
        <section
          id="attention-details"
          className="mt-5 scroll-mt-24 rounded-2xl border border-amber-300 bg-white p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-amber-800 uppercase">
                Coach follow-up
              </p>
              <h2 className="font-heading mt-1 text-2xl font-bold">
                No assignments in 30 days
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/trainer?${sportQuery}`}>Clear view</Link>}
            />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {health.inactiveCoaches.map((coach) => (
              <div
                key={coach.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <p className="font-semibold text-slate-950">{coach.name}</p>
                <p className="text-xs text-slate-500">
                  {coach.lastAssignedAt
                    ? `Last assigned ${new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(coach.lastAssignedAt)}`
                    : "No training assigned yet"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <HealthCard
          label={`${sport} enrollment`}
          value={String(totals.athletes)}
          detail={`Every athlete with ${sport} selected on their profile`}
          href={viewHref("enrollment", "player-scorecards")}
          action="View athletes"
          icon={Users}
          accent
        />
        <HealthCard
          label="Active players"
          value={`${totals.activeAthleteRate}%`}
          detail={`${totals.activeAthletes} completed training in the last 30 days`}
          href={viewHref("active", "player-scorecards")}
          action="View active players"
          icon={Activity}
        />
        <HealthCard
          label="Video reach"
          value={`${totals.videoViewRate}%`}
          detail={`${totals.videoViewers} players started a published ${sport} video`}
          href={viewHref("video", "player-scorecards")}
          action="View viewers"
          icon={Film}
        />
        <HealthCard
          label="Course completion"
          value={`${totals.courseCompletionRate}%`}
          detail={`${totals.courseCompleters} players completed at least one course`}
          href={viewHref("completed", "player-scorecards")}
          action="View completions"
          icon={CheckCircle2}
        />
        <HealthCard
          label="Coach participation"
          value={`${totals.coachContributionRate}%`}
          detail={`${totals.contributingCoaches} of ${totals.coaches} connected coaches pushed video in 30 days`}
          href={viewHref("coaches", "program-details")}
          action="View coaches"
          icon={CircleGauge}
        />
        <HealthCard
          label="Training output"
          value={String(totals.completedWorkouts)}
          detail={`${sport} workouts completed in the last 30 days`}
          href={viewHref("workouts", "program-details")}
          action="View activity"
          icon={Dumbbell}
        />
      </section>

      {view === "coaches" ? (
        <section
          id="program-details"
          className="mt-5 scroll-mt-24 rounded-2xl border border-brand/30 bg-white p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Coach participation
              </p>
              <h2 className="font-heading mt-1 text-2xl font-bold">
                Connected {sport} coaches
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/trainer?${sportQuery}`}>Close details</Link>}
            />
          </div>
          {health.coaches.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {health.coaches.map((coach) => (
                <div
                  key={coach.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-semibold text-slate-950">{coach.name}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={coach.contributedVideo ? "default" : "secondary"}
                    >
                      {coach.contributedVideo
                        ? "Pushed video · 30 days"
                        : "No video · 30 days"}
                    </Badge>
                    <Badge
                      variant={coach.assignedTraining ? "default" : "secondary"}
                    >
                      {coach.assignedTraining
                        ? "Assigned training"
                        : "No assignment · 30 days"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No coaches are connected to {sport} athletes yet.
            </p>
          )}
        </section>
      ) : null}

      {view === "workouts" ? (
        <section
          id="program-details"
          className="mt-5 scroll-mt-24 rounded-2xl border border-brand/30 bg-white p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Training output
              </p>
              <h2 className="font-heading mt-1 text-2xl font-bold">
                Completed in the last 30 days
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/trainer?${sportQuery}`}>Close details</Link>}
            />
          </div>
          {health.recentWorkouts.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {health.recentWorkouts.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {session.workout.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {session.athlete.firstName} {session.athlete.lastName}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {session.completedAt
                      ? new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(session.completedAt)
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No {sport} workouts were completed in the last 30 days.
            </p>
          )}
        </section>
      ) : null}

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
              label={`Enrolled in ${sport}`}
              count={totals.athletes}
              total={totals.athletes}
              rate={totals.athletes > 0 ? 100 : 0}
              sport={sport}
            />
            <RateBar
              label="Active this month"
              count={totals.activeAthletes}
              total={totals.athletes}
              rate={totals.activeAthleteRate}
              sport={sport}
            />
            <RateBar
              label="Watched program video"
              count={totals.videoViewers}
              total={totals.athletes}
              rate={totals.videoViewRate}
              sport={sport}
            />
            <RateBar
              label="Completed a course"
              count={totals.courseCompleters}
              total={totals.athletes}
              rate={totals.courseCompletionRate}
              sport={sport}
            />
          </div>
          <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            Video and course engagement begins recording with this release.
            Percentages use all athletes who selected {sport}, including
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
              render={<Link href={`/library?${sportQuery}`}>Manage all</Link>}
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
              <p className="mt-2 font-semibold">No {sport} courses published</p>
              <p className="mt-1 text-sm text-slate-500">
                Build and publish the first course to begin measuring reach.
              </p>
            </div>
          )}
        </section>
      </div>

      <section
        id="player-scorecards"
        className="mt-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Player scorecards
            </p>
            <h2 className="font-heading mt-1 text-2xl font-bold">
              {attention === "no-training"
                ? "Athletes not training"
                : attention === "no-coach"
                  ? "Athletes without coaches"
                  : attention === "incomplete-courses"
                    ? "Athletes with incomplete courses"
                    : view === "active"
                      ? "Active players · last 30 days"
                      : view === "video"
                        ? "Players reached by video"
                        : view === "completed"
                          ? "Players completing courses"
                    : `Every ${sport} athlete`}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {filteredAthletes.length}{" "}
              {attention
                ? "need attention"
                : view && view !== "enrollment"
                  ? "matching"
                  : "enrolled"}
            </Badge>
            {["no-training", "no-coach", "incomplete-courses"].includes(
              attention ?? "",
            ) || ["enrollment", "active", "video", "completed"].includes(
              view ?? "",
            ) ? (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={`/trainer?${sportQuery}`}>Clear filter</Link>}
              />
            ) : null}
          </div>
        </div>
        {filteredAthletes.length > 0 ? (
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
                {filteredAthletes.map((athlete) => (
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
                        {athlete.completedCourse
                          ? "Completed"
                          : athlete.startedCourse
                            ? "In progress"
                            : "Not started"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            {view === "active"
              ? `No ${sport} athletes completed training in the last 30 days.`
              : view === "video"
                ? `No ${sport} athletes have started a published video yet.`
                : view === "completed"
                  ? `No ${sport} athletes have completed a course yet.`
                  : `Players appear here as soon as ${sport} is selected on their profile.`}
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
              Suggested {sport} drills
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
              <Link href={`/trainer/drills?${sportQuery}`}>
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
                      href={`/trainer/drills?${sportQuery}&edit=${drill.id}`}
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
      </div>
    </DashboardShell>
  );
}
