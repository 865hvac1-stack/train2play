import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleGauge,
  Dumbbell,
  Film,
  Search,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  Volleyball,
} from "lucide-react";
import Link from "next/link";

import { AdminGrowthChart } from "@/components/admin-growth-chart";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPlatformCommandCenter,
  getPlatformGrowth,
  normalizeAdminRange,
} from "@/lib/admin-analytics";
import { prisma } from "@/lib/db";
import { COACH_DISCOVERY_STATUS } from "@/lib/coaching/status";

const RANGE_OPTIONS = [
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["year", "Year"],
  ["all", "All time"],
] as const;

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        accent
          ? "group rounded-2xl border border-brand bg-brand p-4 text-black transition hover:-translate-y-0.5 hover:shadow-lg"
          : "group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-md"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold tracking-[0.14em] text-current/65 uppercase">
          {label}
        </p>
        <Icon className="size-4 text-current/60" />
      </div>
      <p className="font-heading mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-current/65">{detail}</p>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-heading text-xl font-bold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function relativeTime(date: Date) {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function AdminCommandCenter({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; growth?: string }>;
}) {
  const query = await searchParams;
  const range = normalizeAdminRange(query.range);
  const growthDays =
    query.growth === "90" ? 90 : query.growth === "365" ? 365 : 30;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [data, growth, coachApps, backgroundPending, requestsMonth, approvedCoaches, acceptingCoaches] =
    await Promise.all([
      getPlatformCommandCenter(range),
      getPlatformGrowth(growthDays),
      prisma.coachProfile.count({
        where: { discoveryStatus: { in: [COACH_DISCOVERY_STATUS.SUBMITTED, COACH_DISCOVERY_STATUS.UNDER_REVIEW] } },
      }),
      prisma.coachProfile.count({
        where: { backgroundCheckStatus: { in: ["PENDING", "REVIEW_REQUIRED"] } },
      }),
      prisma.coachAthleteConnection.count({
        where: { source: "DISCOVERY", requestedAt: { gte: monthStart } },
      }),
      prisma.coachProfile.count({ where: { discoveryStatus: COACH_DISCOVERY_STATUS.APPROVED } }),
      prisma.coachProfile.count({
        where: {
          discoveryStatus: COACH_DISCOVERY_STATUS.APPROVED,
          acceptingAthletes: true,
          appearInFindACoach: true,
        },
      }),
    ]);
  const m = data.metrics;
  const biggestDrop = [...data.conversions].sort((a, b) => b.drop - a.drop)[0];

  return (
    <AdminShell
      title="Command center"
      description="The health of Train2Play, in one place."
      action={
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/admin/search">
              <Search className="size-4" />
              <span className="hidden sm:inline">Search platform</span>
            </Link>
          }
        />
      }
    >
      <section className="overflow-hidden rounded-3xl bg-black p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">
              Train2Play Platform Admin
            </p>
            <h2 className="font-heading mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Train2Play Command Center
            </h2>
            <p className="mt-2 text-sm text-zinc-400 sm:text-base">
              The health of the entire platform, in one place.
            </p>
            <p className="mt-4 text-xs text-zinc-500">
              Reporting generated {data.generatedAt.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/admin/organizations/new">Add organization</Link>}
            />
            <Button
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              nativeButton={false}
              render={<Link href="/admin/directors/new">Add director</Link>}
            />
            <Button
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              nativeButton={false}
              render={<Link href="/admin/content">Create content</Link>}
            />
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {RANGE_OPTIONS.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={range === value ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={`/admin?range=${value}&growth=${growthDays}`}>{label}</Link>
            }
          />
        ))}
      </div>

      <section className="mt-7">
        <SectionHeading
          eyebrow="Operate"
          title="Needs attention"
          description="Real conditions that need a platform-level response."
          action={
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/admin/activity">View platform activity</Link>}
            />
          }
        />
        {data.attention.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-6 text-emerald-700" />
              <div>
                <p className="font-bold text-emerald-950">Everything is caught up.</p>
                <p className="text-sm text-emerald-800">
                  No platform issues currently meet an attention condition.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.attention.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group rounded-2xl border border-amber-300 bg-amber-50 p-4 transition hover:border-amber-500 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-amber-100 p-2 text-amber-800">
                    <AlertTriangle className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-amber-950">{item.title}</p>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                    <p className="mt-3 text-xs font-bold tracking-wide text-brand uppercase">
                      View results <ArrowRight className="inline size-3" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeading
          eyebrow="Platform metrics"
          title="What is happening now"
          description="Lifetime population cards stay lifetime; activity cards honor the selected period."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total athletes"
            value={m.totalAthletes.toLocaleString()}
            detail={`+${m.athletesThisMonth} this month`}
            icon={Users}
            href="/admin/users?role=ATHLETE"
            accent
          />
          <MetricCard
            label="Total coaches"
            value={m.totalCoaches.toLocaleString()}
            detail={`+${m.coachesThisMonth} this month`}
            icon={UserPlus}
            href="/admin/users?role=COACH"
          />
          <MetricCard
            label="Directors"
            value={m.totalDirectors.toLocaleString()}
            detail={`+${m.directorsThisMonth} this month`}
            icon={ShieldCheck}
            href="/admin/directors"
          />
          <MetricCard
            label="Organizations"
            value={m.totalOrganizations.toLocaleString()}
            detail={`+${m.organizationsThisMonth} this month`}
            icon={Building2}
            href="/admin/organizations"
          />
          <MetricCard
            label="Active athletes"
            value={`${m.activeAthleteRate}%`}
            detail={`${m.activeAthletes} meaningful activity in 30 days`}
            icon={CircleGauge}
            href="/admin/users?role=ATHLETE&journey=active"
          />
          <MetricCard
            label="Training output"
            value={m.workoutsCompleted.toLocaleString()}
            detail="Completed workouts in selected period"
            icon={Dumbbell}
            href={`/admin/reports?report=training&range=${range}`}
          />
          <MetricCard
            label="Video activity"
            value={m.videosUploaded.toLocaleString()}
            detail={`${m.videosReviewed} reviewed in selected period`}
            icon={Film}
            href={`/admin/activity?type=VIDEOS&range=${range}`}
          />
          <MetricCard
            label="Personal records"
            value={m.personalRecords.toLocaleString()}
            detail="PRs recorded in selected period"
            icon={Trophy}
            href={`/admin/activity?type=PROGRESS&range=${range}`}
          />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading
          eyebrow="Coach network"
          title="Approvals and discovery"
          description="Coach accounts are not automatically Train2Play Approved."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Coach applications"
            value={coachApps.toLocaleString()}
            detail="Awaiting review"
            icon={UserPlus}
            href="/admin/coaches?status=SUBMITTED"
            accent={coachApps > 0}
          />
          <MetricCard
            label="Background checks"
            value={backgroundPending.toLocaleString()}
            detail="Pending / review required"
            icon={ShieldCheck}
            href="/admin/coaches?status=BG_PENDING"
          />
          <MetricCard
            label="Coach requests"
            value={requestsMonth.toLocaleString()}
            detail="This month"
            icon={Users}
            href="/admin/coaches"
          />
          <MetricCard
            label="Approved coaches"
            value={approvedCoaches.toLocaleString()}
            detail="Train2Play Approved"
            icon={CheckCircle2}
            href="/admin/coaches?status=APPROVED"
          />
          <MetricCard
            label="Accepting athletes"
            value={acceptingCoaches.toLocaleString()}
            detail="Currently listed"
            icon={UserPlus}
            href="/admin/coaches?status=APPROVED"
          />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <SectionHeading
          eyebrow="Growth"
          title="Platform growth"
          description="New accounts and organizations by reporting bucket."
          action={
            <div className="flex gap-1">
              {[
                [30, "30 days"],
                [90, "90 days"],
                [365, "12 months"],
              ].map(([days, label]) => (
                <Button
                  key={days}
                  size="sm"
                  variant={growthDays === days ? "default" : "ghost"}
                  nativeButton={false}
                  render={
                    <Link href={`/admin?range=${range}&growth=${days}`}>{label}</Link>
                  }
                />
              ))}
            </div>
          }
        />
        <AdminGrowthChart data={growth} />
      </section>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <SectionHeading
            eyebrow="Conversion"
            title="Athlete journey"
            description="From registration to meaningful development."
          />
          <div className="space-y-3">
            {data.journey.map((stage, index) => (
              <Link
                key={stage.key}
                href={stage.href}
                className="group grid gap-2 rounded-xl border border-slate-100 p-3 transition hover:border-brand/50 sm:grid-cols-[190px_1fr_100px]"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{stage.label}</p>
                  <p className="text-xs text-slate-500">Stage {index + 1}</p>
                </div>
                <div className="my-auto h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${stage.percent}%` }}
                  />
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-heading text-xl font-bold">{stage.count}</p>
                  <p className="text-xs text-slate-500">{stage.percent}% of profiles</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <SectionHeading
            eyebrow="Drop-off"
            title="Conversion health"
            description="The largest current journey gaps."
          />
          {biggestDrop ? (
            <div className="mb-4 rounded-xl bg-black p-4 text-white">
              <p className="text-[10px] font-bold tracking-[0.16em] text-brand uppercase">
                Largest drop-off
              </p>
              <p className="mt-2 font-bold">
                {biggestDrop.from} → {biggestDrop.to}
              </p>
              <p className="font-heading mt-3 text-3xl font-bold">
                {biggestDrop.rate}%
              </p>
              <p className="text-xs text-zinc-400">
                {biggestDrop.drop} profiles have not reached the next stage.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            {data.conversions.map((conversion) => (
              <div
                key={`${conversion.from}-${conversion.to}`}
                className="rounded-xl border border-slate-100 p-3"
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-600">
                    {conversion.from} → {conversion.to}
                  </span>
                  <strong>{conversion.rate}%</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <SectionHeading
            eyebrow="Real time"
            title="Live on Train2Play"
            description="Meaningful platform actions, not every database update."
            action={
              <Button
                size="sm"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/admin/activity">Full activity</Link>}
              />
            }
          />
          {data.activity.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
              Platform activity will appear here as users begin training.
            </p>
          ) : (
            <div className="space-y-1">
              {data.activity.slice(0, 10).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50"
                >
                  <span className="mt-1 rounded-full bg-brand/15 p-1.5 text-brand">
                    <Activity className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="truncate text-xs text-slate-500">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {relativeTime(item.at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <SectionHeading
            eyebrow="Organizations"
            title="Organization health"
            description="Current organization footprint and 30-day training."
            action={
              <Button
                size="sm"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/admin/organizations">All organizations</Link>}
              />
            }
          />
          {data.organizations.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6">
              <p className="font-bold">Create your first Train2Play organization.</p>
              <Button
                className="mt-3"
                size="sm"
                nativeButton={false}
                render={<Link href="/admin/organizations/new">Add organization</Link>}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {data.organizations.map((organization) => (
                <Link
                  key={organization.id}
                  href={`/admin/organizations/${organization.id}`}
                  className="grid gap-2 rounded-xl border border-slate-100 p-3 transition hover:border-brand/50 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{organization.name}</p>
                    <p className="text-xs text-slate-500">
                      {organization.athletes} athletes · {organization.coaches} coaches ·{" "}
                      {organization.sports.length
                        ? organization.sports.join(", ")
                        : "No team sports configured"}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-bold">{organization.workouts}</p>
                    <p className="text-[11px] text-slate-500">workouts · 30 days</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <SectionHeading
          eyebrow="Sports"
          title="Sport health"
          description="Participation and development across all Train2Play organizations."
          action={
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/admin/sports">Compare sports</Link>}
            />
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.sports.map((sport) => (
            <Link
              key={sport.id}
              href={`/admin/sports/${sport.id}`}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-brand/60 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Volleyball className="size-5 text-brand" />
                <Badge variant="outline">{sport.activeRate}% active</Badge>
              </div>
              <p className="font-heading mt-3 text-lg font-bold">{sport.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {sport.athletes} athletes · {sport.coaches} coaches
              </p>
              <p className="text-xs text-slate-500">
                {sport.organizations} organizations · {sport.workouts} workouts
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl bg-black p-5 text-white">
          <Dumbbell className="size-5 text-brand" />
          <h2 className="font-heading mt-3 text-xl font-bold">Training health</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-400">Athletes with active plans</dt>
              <dd className="font-bold">{data.health.training.assignedPlans}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Completed workouts</dt>
              <dd className="font-bold">{data.health.training.completedWorkouts}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">No active plan</dt>
              <dd className="font-bold">{data.health.training.noActivePlan}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <Film className="size-5 text-brand" />
          <h2 className="font-heading mt-3 text-xl font-bold">Video health</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Uploaded</dt>
              <dd className="font-bold">{data.health.videos.uploaded}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Reviewed</dt>
              <dd className="font-bold">{data.health.videos.reviewed}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Waiting over 48h</dt>
              <dd className="font-bold">{data.health.videos.pendingOver48Hours}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <CircleGauge className="size-5 text-brand" />
          <h2 className="font-heading mt-3 text-xl font-bold">System health</h2>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ["Application", true],
              ["Database", true],
              ["Email", Boolean(process.env.RESEND_API_KEY)],
              [
                "Storage",
                Boolean(
                  process.env.CLOUDINARY_URL ||
                    (process.env.S3_BUCKET && process.env.S3_REGION),
                ),
              ],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex justify-between gap-3">
                <span className="text-slate-500">{label}</span>
                <Badge variant={ok ? "secondary" : "outline"}>
                  {ok ? "Operational" : "Not configured"}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <SectionHeading eyebrow="Shortcuts" title="Quick actions" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              href: "/admin/organizations/new",
              label: "Add organization",
              icon: Building2,
            },
            {
              href: "/admin/directors/new",
              label: "Add director",
              icon: ShieldCheck,
            },
            {
              href: "/admin/content",
              label: "Add platform content",
              icon: Dumbbell,
            },
            { href: "/admin/metrics/new", label: "Add metric", icon: Trophy },
            { href: "/admin/search", label: "Search platform", icon: Search },
          ].map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              variant="outline"
              className="h-auto justify-start p-4"
              nativeButton={false}
              render={
                <Link href={href}>
                  <Icon className="size-4 text-brand" />
                  {label}
                </Link>
              }
            />
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
