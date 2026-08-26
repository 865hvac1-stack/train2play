import Link from "next/link";
import { BookOpen, Camera, Pencil, PlayCircle, Users } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCatalogDrills } from "@/lib/catalog-drills";
import { ageBandFromAge, ageFromDateOfBirth } from "@/lib/drills";
import { requireLibraryEditor } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function TrainerHomePage() {
  const user = await requireLibraryEditor();
  const baseballProfileWhere = {
    OR: [
      { sports: { some: { sport: { equals: "Baseball", mode: "insensitive" as const } } } },
      { primarySport: { equals: "Baseball", mode: "insensitive" as const } },
      {
        legacyAthlete: {
          is: { sport: { equals: "Baseball", mode: "insensitive" as const } },
        },
      },
    ],
  };

  const [athletes, athleteCourses, baseballDrills, courseCount] =
    await Promise.all([
      prisma.athleteProfile.findMany({
        where: baseballProfileWhere,
        include: {
          sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
          legacyAthlete: {
            select: { dateOfBirth: true, sport: true },
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.course.findMany({
        where: {
          origin: "PLATFORM",
          published: true,
          shareWithAthletes: true,
          sport: { equals: "Baseball", mode: "insensitive" },
        },
        include: {
          items: {
            where: { videoUrl: { not: null } },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      listCatalogDrills({ sport: "Baseball" }),
      prisma.course.count({ where: { origin: "PLATFORM" } }),
  ]);
  const videos = athleteCourses.flatMap((course) =>
    course.items.map((item) => ({ ...item, course })),
  );

  return (
    <DashboardShell
      title="Baseball trainer dashboard"
      description="See every athlete who selected Baseball and manage the exact recommendations they receive."
      actions={
        <Button
          nativeButton={false}
          render={<Link href="/library/new">New library course</Link>}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand/20 bg-white p-4">
          <Users className="size-5 text-brand" />
          <p className="font-heading mt-3 text-3xl font-bold">{athletes.length}</p>
          <p className="text-sm text-slate-600">Baseball athletes</p>
        </div>
        <div className="rounded-2xl border border-brand/20 bg-white p-4">
          <PlayCircle className="size-5 text-brand" />
          <p className="font-heading mt-3 text-3xl font-bold">{videos.length}</p>
          <p className="text-sm text-slate-600">Published videos</p>
        </div>
        <div className="rounded-2xl border border-brand/20 bg-white p-4">
          <BookOpen className="size-5 text-brand" />
          <p className="font-heading mt-3 text-3xl font-bold">
            {baseballDrills.length}
          </p>
          <p className="text-sm text-slate-600">Suggested drills</p>
        </div>
        <Link
          href="/library"
          className="rounded-2xl border border-brand/20 bg-white p-5 hover:border-brand/40"
        >
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Master catalog
          </p>
          <p className="font-heading mt-3 text-3xl font-bold">{courseCount}</p>
          <p className="mt-2 text-sm text-slate-600">
            Sport-library course{courseCount === 1 ? "" : "s"}
          </p>
        </Link>
      </div>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Baseball roster
              </p>
              <h2 className="font-heading mt-1 text-2xl font-bold">
                Players in Train2Play
              </h2>
            </div>
            <Badge variant="secondary">{athletes.length} total</Badge>
          </div>

          {athletes.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {athletes.map((athlete) => {
                const sports =
                  athlete.sports.length > 0
                    ? athlete.sports
                    : [
                        {
                          id: `fallback-${athlete.id}`,
                          sport:
                            athlete.primarySport ??
                            athlete.legacyAthlete?.sport ??
                            "Baseball",
                          isPrimary: true,
                          athleteProfileId: athlete.id,
                          position: null,
                        },
                      ];
                const dateOfBirth =
                  athlete.dateOfBirth ?? athlete.legacyAthlete?.dateOfBirth;
                const ageBand = ageBandFromAge(
                  ageFromDateOfBirth(dateOfBirth),
                ).label;

                return (
                  <div
                    key={athlete.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/10 font-heading font-bold text-brand">
                        {athlete.firstName.charAt(0)}
                        {athlete.lastName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">
                          {athlete.firstName} {athlete.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{ageBand}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                      {sports.map((sport) => (
                        <Badge
                          key={sport.id}
                          variant={sport.isPrimary ? "default" : "outline"}
                        >
                          {sport.sport}
                          {sport.isPrimary ? " · Primary" : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              No athlete has selected Baseball yet. Players appear here as soon
              as Baseball is saved on their profile.
            </p>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Athlete view
              </p>
              <h2 className="font-heading mt-1 text-2xl font-bold">
                Videos players see
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/library?sport=Baseball">Manage library</Link>}
            />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            These are published to every athlete with Baseball on their profile.
          </p>

          {videos.length > 0 ? (
            <div className="mt-4 space-y-3">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">
                        {video.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {video.course.title}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={
                        <Link
                          href={`/courses/${video.course.id}?item=${video.id}`}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5">
              <Camera className="size-5 text-brand" />
              <p className="mt-2 font-semibold text-slate-900">
                No Baseball videos published yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add a course item, record with either phone camera, and publish
                the course to athletes.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Recommended for players
            </p>
            <h2 className="font-heading mt-1 text-2xl font-bold">
              Baseball suggested drills
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Players receive two drills matched to their age band. Editing here
              changes the recommendation everywhere.
            </p>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/trainer/drills?sport=Baseball">Add drill</Link>}
          />
        </div>
        {baseballDrills.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {baseballDrills.map((drill) => (
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
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No Baseball recommendations are active.
          </p>
        )}
      </section>

      <div className="mt-5 text-sm text-slate-500">
        Signed in as {user.email}. Athlete data is visible only to Train2Play
        trainers and platform admins.
      </div>
    </DashboardShell>
  );
}
