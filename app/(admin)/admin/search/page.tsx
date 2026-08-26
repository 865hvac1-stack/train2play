import { BookOpen, Building2, Dumbbell, Search, UserRound } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db";

export default async function AdminGlobalSearch({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQuery } = await searchParams;
  const query = rawQuery?.trim() ?? "";
  const [users, organizations, courses, plans] =
    query.length >= 2
      ? await Promise.all([
          prisma.user.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            },
            include: {
              organizationMemberships: {
                include: { organization: true },
                take: 2,
              },
              athleteProfile: { include: { sports: true } },
            },
            take: 10,
          }),
          prisma.organization.findMany({
            where: { name: { contains: query, mode: "insensitive" } },
            take: 10,
          }),
          prisma.course.findMany({
            where: {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { sport: { contains: query, mode: "insensitive" } },
              ],
            },
            include: { coach: true },
            take: 10,
          }),
          prisma.trainingPlan.findMany({
            where: { title: { contains: query, mode: "insensitive" } },
            include: { coach: true, athlete: true },
            take: 10,
          }),
        ])
      : [[], [], [], []];

  const total = users.length + organizations.length + courses.length + plans.length;
  return (
    <AdminShell
      title="Global search"
      description="Find a person, organization, program, course, email, or sport."
    >
      <form className="flex max-w-3xl gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            autoFocus
            name="q"
            defaultValue={query}
            placeholder="Search Hudson, NexGen, Baseball Foundation..."
            className="h-12 pl-9"
          />
        </div>
        <Button type="submit" className="h-12">
          Search
        </Button>
      </form>

      {query.length < 2 ? (
        <div className="mt-5 rounded-2xl border border-dashed bg-white p-10 text-center">
          <Search className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 font-bold">Search the entire Train2Play platform.</p>
          <p className="text-sm text-slate-500">Enter at least two characters.</p>
        </div>
      ) : total === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed bg-white p-10 text-center">
          <p className="font-bold">No results for “{query}”.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ResultSection title="People" icon={UserRound} count={users.length}>
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="block rounded-xl border p-3 hover:border-brand/60"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Badge variant="outline">
                    {user.role === "TRAINER" ? "Director" : user.role}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {user.organizationMemberships
                    .map((row) => row.organization.name)
                    .join(", ") || "No organization"}
                  {user.athleteProfile?.sports.length
                    ? ` · ${user.athleteProfile.sports.map((row) => row.sport).join(", ")}`
                    : ""}
                </p>
              </Link>
            ))}
          </ResultSection>
          <ResultSection
            title="Organizations"
            icon={Building2}
            count={organizations.length}
          >
            {organizations.map((organization) => (
              <Link
                key={organization.id}
                href={`/admin/organizations/${organization.id}`}
                className="block rounded-xl border p-3 hover:border-brand/60"
              >
                <p className="font-semibold">{organization.name}</p>
                <p className="text-xs text-slate-500">/{organization.slug}</p>
              </Link>
            ))}
          </ResultSection>
          <ResultSection title="Courses" icon={BookOpen} count={courses.length}>
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="block rounded-xl border p-3 hover:border-brand/60"
              >
                <p className="font-semibold">{course.title}</p>
                <p className="text-xs text-slate-500">
                  {course.sport} · {course.coach.name} · {course.origin}
                </p>
              </Link>
            ))}
          </ResultSection>
          <ResultSection title="Training plans" icon={Dumbbell} count={plans.length}>
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/training/${plan.id}`}
                className="block rounded-xl border p-3 hover:border-brand/60"
              >
                <p className="font-semibold">{plan.title}</p>
                <p className="text-xs text-slate-500">
                  {plan.coach.name}
                  {plan.athlete
                    ? ` · ${plan.athlete.firstName} ${plan.athlete.lastName}`
                    : ""}
                </p>
              </Link>
            ))}
          </ResultSection>
        </div>
      )}
    </AdminShell>
  );
}

function ResultSection({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
          <Icon className="size-4 text-brand" />
          {title}
        </h2>
        <Badge variant="outline">{count}</Badge>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}
