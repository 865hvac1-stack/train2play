import Link from "next/link";

import { CoachSearchCard } from "@/components/coach-profile-view";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { searchDiscoverableCoaches } from "@/lib/coaching/discovery";
import { allCoachingSports, specialtiesForSport } from "@/lib/coaching/specialties";
import { COACHING_AGE_GROUPS } from "@/lib/coaching/specialties";
import {
  ACTIVE_REQUEST_STATUSES,
  CONNECTION_STATUS,
  expireStaleDiscoveryRequests,
} from "@/lib/coach-connections";
import { prisma } from "@/lib/db";
import {
  approveGuardianCoachRequestAction,
  cancelCoachRequestAction,
} from "@/app/(athlete)/athlete/coaches/actions";

export default async function FindACoachPage({
  searchParams,
}: {
  searchParams: Promise<{
    sport?: string;
    specialty?: string;
    position?: string;
    ageGroup?: string;
    location?: string;
    method?: string;
    accepting?: string;
    organization?: string;
    page?: string;
  }>;
}) {
  const ctx = await requireAthleteContext();
  await expireStaleDiscoveryRequests({ athleteProfileId: ctx.profileId });
  const query = await searchParams;
  const sport = query.sport?.trim() || "";
  const page = Number(query.page) || 1;
  const result = await searchDiscoverableCoaches({
    sport,
    specialty: query.specialty,
    position: query.position,
    ageGroup: query.ageGroup,
    location: query.location,
    method:
      query.method === "in-person" || query.method === "remote" || query.method === "both"
        ? query.method
        : "",
    accepting: query.accepting === "1",
    organization: query.organization,
    page,
  });

  const connections = await prisma.coachAthleteConnection.findMany({
    where: { athleteProfileId: ctx.profileId },
    include: { coachUser: { select: { name: true } } },
    orderBy: { requestedAt: "desc" },
  });

  const guardianPending = connections.filter(
    (row) => row.status === CONNECTION_STATUS.PENDING_GUARDIAN,
  );

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (query.specialty) params.set("specialty", query.specialty);
    if (query.position) params.set("position", query.position);
    if (query.ageGroup) params.set("ageGroup", query.ageGroup);
    if (query.location) params.set("location", query.location);
    if (query.method) params.set("method", query.method);
    if (query.accepting === "1") params.set("accepting", "1");
    if (query.organization) params.set("organization", query.organization);
    params.set("page", String(nextPage));
    return `/athlete/coaches?${params}`;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">Find a Coach</p>
        <h1 className="font-heading text-3xl font-bold">Train2Play Approved Coaches</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Browse approved coaches, then request to connect. Already know your coach?{" "}
          <Link href="/athlete/connect" className="font-semibold text-brand underline">
            Enter a coach code
          </Link>
          .
        </p>
      </div>

      {guardianPending.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-200">Guardian approval needed</p>
          {guardianPending.map((row) => {
            const approve = approveGuardianCoachRequestAction.bind(null, row.id);
            const cancel = cancelCoachRequestAction.bind(null, row.id);
            return (
              <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-200">
                  A parent or guardian must confirm the request to {row.coachUser.name}.
                </p>
                <div className="flex gap-2">
                  <form action={approve}>
                    <button type="submit" className="min-h-11 rounded-lg bg-brand px-4 text-sm font-bold text-black">
                      Confirm guardian approval
                    </button>
                  </form>
                  <form action={cancel}>
                    <button type="submit" className="min-h-11 rounded-lg border border-white/20 px-4 text-sm">
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      <form className="grid gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-3 sm:grid-cols-2">
        <select name="sport" defaultValue={sport} className="h-11 rounded-lg border border-white/15 bg-black px-2">
          <option value="">All sports</option>
          {allCoachingSports().map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select name="specialty" defaultValue={query.specialty ?? ""} className="h-11 rounded-lg border border-white/15 bg-black px-2">
          <option value="">All specialties</option>
          {(sport ? specialtiesForSport(sport) : ["Player Development", "Strength", "Speed"]).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          name="position"
          defaultValue={query.position ?? ""}
          placeholder="Position"
          className="h-11 rounded-lg border border-white/15 bg-black px-3"
        />
        <select name="ageGroup" defaultValue={query.ageGroup ?? ""} className="h-11 rounded-lg border border-white/15 bg-black px-2">
          <option value="">All age groups</option>
          {COACHING_AGE_GROUPS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select name="method" defaultValue={query.method ?? ""} className="h-11 rounded-lg border border-white/15 bg-black px-2">
          <option value="">In-person or remote</option>
          <option value="in-person">In-person</option>
          <option value="remote">Remote</option>
          <option value="both">Both</option>
        </select>
        <input
          name="organization"
          defaultValue={query.organization ?? ""}
          placeholder="Organization"
          className="h-11 rounded-lg border border-white/15 bg-black px-3"
        />
        <input
          name="location"
          defaultValue={query.location ?? ""}
          placeholder="Location or service area"
          className="h-11 rounded-lg border border-white/15 bg-black px-3 sm:col-span-2"
        />
        <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="accepting" value="1" defaultChecked={query.accepting === "1"} className="accent-brand" />
          Accepting athletes
        </label>
        <button type="submit" className="min-h-11 rounded-lg bg-brand text-sm font-bold text-black sm:col-span-2">
          Search
        </button>
      </form>

      {result.coaches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-zinc-400">
          No coaches found. Try expanding your location or selecting Remote Coaching.
        </p>
      ) : (
        <ul className="space-y-3">
          {result.coaches.map((coach) => {
            const connected = connections.some(
              (row) => row.coachUserId === coach.userId && row.status === CONNECTION_STATUS.APPROVED,
            );
            const pending = connections.some(
              (row) =>
                row.coachUserId === coach.userId &&
                (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(row.status),
            );
            return (
              <li key={coach.id}>
                <CoachSearchCard
                  href={coach.slug ? `/coach/${coach.slug}` : "/athlete/coaches"}
                  name={coach.name}
                  avatarUrl={coach.avatarUrl}
                  sport={coach.sport}
                  specialties={coach.specialties}
                  organizationName={coach.organizationName}
                  locationLabel={coach.locationLabel}
                  inPerson={coach.inPerson}
                  remote={coach.remote}
                  accepting={connected ? true : coach.accepting}
                  approved={coach.approved}
                />
                {connected ? (
                  <p className="mt-1 px-1 text-xs font-semibold text-emerald-400">
                    You&apos;re connected. Your coach can now assign training and review your development.
                  </p>
                ) : pending ? (
                  <p className="mt-1 px-1 text-xs font-semibold text-brand">
                    Your request is pending. We&apos;ll let you know when the coach responds.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {result.pages > 1 ? (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className="font-semibold text-brand">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <p>
            Page {result.page} of {result.pages}
          </p>
          {page < result.pages ? (
            <Link href={hrefFor(page + 1)} className="font-semibold text-brand">
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
