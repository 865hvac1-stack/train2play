import { BarChart3, Download } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  countAthletesForSport,
  normalizeAdminRange,
  rangeStart,
} from "@/lib/admin-analytics";
import { prisma } from "@/lib/db";

const REPORTS = [
  ["overview", "Platform overview"],
  ["athletes", "Athlete growth"],
  ["coaches", "Coach growth"],
  ["organizations", "Organization growth"],
  ["active", "Active athletes"],
  ["training", "Workout completion"],
  ["videos", "Video engagement"],
  ["courses", "Course completion"],
  ["sports", "Sport participation"],
  ["prs", "PR activity"],
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    report?: string;
    range?: string;
    sport?: string;
    organization?: string;
  }>;
}) {
  const query = await searchParams;
  const range = normalizeAdminRange(query.range);
  const start = rangeStart(range);
  const report = REPORTS.some(([key]) => key === query.report)
    ? query.report!
    : "overview";
  const [sports, organizations] = await Promise.all([
    prisma.platformSport.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const sportWhere = query.sport
    ? { sport: { equals: query.sport, mode: "insensitive" as const } }
    : {};
  const athleteOrgWhere = query.organization
    ? {
        athleteProfile: {
          memberships: { some: { organizationId: query.organization } },
        },
      }
    : {};

  const [
    newAthletes,
    newCoaches,
    newOrganizations,
    workouts,
    completedWorkouts,
    videosUploaded,
    videosReviewed,
    courseViews,
    courseCompletions,
    prs,
  ] = await Promise.all([
    prisma.athleteProfile.count({
      where: {
        ...(start ? { createdAt: { gte: start } } : {}),
        ...(query.sport
          ? {
              OR: [
                { primarySport: query.sport },
                { sports: { some: { sport: query.sport } } },
              ],
            }
          : {}),
        ...(query.organization
          ? { memberships: { some: { organizationId: query.organization } } }
          : {}),
      },
    }),
    prisma.user.count({
      where: {
        role: { in: ["COACH", "STAFF", "ORG_ADMIN"] },
        ...(start ? { createdAt: { gte: start } } : {}),
        ...(query.organization
          ? {
              organizationMemberships: {
                some: { organizationId: query.organization },
              },
            }
          : {}),
      },
    }),
    prisma.organization.count({
      where: {
        ...(start ? { createdAt: { gte: start } } : {}),
        ...(query.organization ? { id: query.organization } : {}),
      },
    }),
    prisma.workoutSession.count({
      where: {
        ...(start ? { createdAt: { gte: start } } : {}),
        athlete: { ...sportWhere, ...athleteOrgWhere },
      },
    }),
    prisma.workoutSession.count({
      where: {
        status: "COMPLETED",
        ...(start ? { completedAt: { gte: start } } : {}),
        athlete: { ...sportWhere, ...athleteOrgWhere },
      },
    }),
    prisma.trainingVideo.count({
      where: {
        ...(start ? { createdAt: { gte: start } } : {}),
        ...(query.sport ? { athlete: sportWhere } : {}),
      },
    }),
    prisma.videoReview.count({
      where: {
        status: "REVIEWED",
        ...(start ? { reviewedAt: { gte: start } } : {}),
        ...(query.sport ? { sport: query.sport } : {}),
        ...(query.organization
          ? {
              athleteProfile: {
                memberships: { some: { organizationId: query.organization } },
              },
            }
          : {}),
      },
    }),
    prisma.courseItemProgress.count({
      where: {
        viewedAt: { not: null },
        ...(start ? { viewedAt: { gte: start } } : {}),
        ...(query.sport
          ? { courseItem: { course: { sport: query.sport } } }
          : {}),
        ...(query.organization
          ? {
              athleteProfile: {
                memberships: { some: { organizationId: query.organization } },
              },
            }
          : {}),
      },
    }),
    prisma.courseItemProgress.count({
      where: {
        completedAt: { not: null },
        ...(start ? { completedAt: { gte: start } } : {}),
        ...(query.sport
          ? { courseItem: { course: { sport: query.sport } } }
          : {}),
        ...(query.organization
          ? {
              athleteProfile: {
                memberships: { some: { organizationId: query.organization } },
              },
            }
          : {}),
      },
    }),
    prisma.exerciseResult.count({
      where: {
        isPersonalRecord: true,
        ...(start ? { completedAt: { gte: start } } : {}),
        ...(query.sport
          ? {
              session: {
                athlete: {
                  sport: { equals: query.sport, mode: "insensitive" },
                },
              },
            }
          : {}),
      },
    }),
  ]);

  const sportParticipation = await Promise.all(
    sports.map(async (sport) => ({
      id: sport.id,
      name: sport.name,
      athletes: await countAthletesForSport(sport.name),
    })),
  );
  const completionRate = workouts
    ? Math.round((completedWorkouts / workouts) * 100)
    : 0;
  const courseRate = courseViews
    ? Math.round((courseCompletions / courseViews) * 100)
    : 0;

  return (
    <AdminShell
      title="Reports"
      description="Real platform reporting with date, organization, and sport filters."
    >
      <div className="grid gap-4 xl:grid-cols-[230px_1fr]">
        <aside className="space-y-1 rounded-2xl border bg-white p-3">
          {REPORTS.map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/reports?${new URLSearchParams({
                report: key,
                range,
                ...(query.sport ? { sport: query.sport } : {}),
                ...(query.organization
                  ? { organization: query.organization }
                  : {}),
              })}`}
              className={`block rounded-lg px-3 py-2 text-sm font-semibold ${
                report === key
                  ? "bg-brand text-black"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </aside>
        <div>
          <form className="flex flex-wrap gap-2 rounded-2xl border bg-white p-4">
            <input type="hidden" name="report" value={report} />
            <select
              name="range"
              defaultValue={range}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="year">Year</option>
              <option value="all">All time</option>
            </select>
            <select
              name="organization"
              defaultValue={query.organization ?? ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All organizations</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
            <select
              name="sport"
              defaultValue={query.sport ?? ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All sports</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.name}>
                  {sport.name}
                </option>
              ))}
            </select>
            <Button type="submit">Apply filters</Button>
          </form>

          <section className="mt-4 rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge>{REPORTS.find(([key]) => key === report)?.[1]}</Badge>
                <h2 className="font-heading mt-2 text-2xl font-bold">
                  Platform report
                </h2>
                <p className="text-sm text-slate-500">
                  {range === "all" ? "All time" : `Selected period: ${range}`}
                  {query.sport ? ` · ${query.sport}` : ""}
                  {query.organization
                    ? ` · ${
                        organizations.find(
                          (organization) => organization.id === query.organization,
                        )?.name
                      }`
                    : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" disabled>
                <Download className="size-4" />
                Export coming later
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["New athletes", newAthletes],
                ["New coaches", newCoaches],
                ["Organizations joined", newOrganizations],
                ["Workout completion", `${completedWorkouts} · ${completionRate}%`],
                ["PR activity", prs],
                ["Videos uploaded", videosUploaded],
                ["Videos reviewed", videosReviewed],
                ["Course starts", courseViews],
                ["Course completions", courseCompletions],
                ["Course completion rate", `${courseRate}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{String(label)}</p>
                  <p className="font-heading mt-2 text-2xl font-bold">
                    {String(value)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {(report === "sports" || report === "overview") && (
            <section className="mt-4 rounded-2xl border bg-white p-5">
              <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
                <BarChart3 className="size-5 text-brand" />
                Sport participation
              </h2>
              <div className="mt-4 space-y-2">
                {sportParticipation.map((sport) => {
                  const max = Math.max(
                    1,
                    ...sportParticipation.map((item) => item.athletes),
                  );
                  return (
                    <Link
                      key={sport.id}
                      href={`/admin/sports/${sport.id}`}
                      className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[160px_1fr_80px]"
                    >
                      <p className="font-semibold">{sport.name}</p>
                      <div className="my-auto h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${(sport.athletes / max) * 100}%` }}
                        />
                      </div>
                      <p className="text-right font-bold">{sport.athletes}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
