import { Activity, Building2, Dumbbell, Film, ShieldCheck, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  assignUserOrganizationAction,
  removeUserOrganizationAction,
} from "@/app/(admin)/admin/actions";
import {
  AdminActivationForm,
  AdminAllowlistNote,
  AdminRoleForm,
} from "@/components/admin-account-controls";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import {
  ALLOWLIST_ENV_VARS,
  allowlistedRoleForEmail,
} from "@/lib/role-allowlist";
import { requirePlatformAdmin } from "@/lib/session";

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
        <Icon className="size-4 text-brand" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function labelRole(role: string) {
  return role === "TRAINER"
    ? "Director"
    : role === "PARENT"
      ? "Guardian"
      : role === "PLATFORM_ADMIN"
        ? "Platform Admin"
        : role === "ORG_ADMIN"
          ? "Organization Admin"
          : role.replaceAll("_", " ");
}

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requirePlatformAdmin();
  const [user, organizations] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        organizationMemberships: { include: { organization: true } },
        athleteProfile: {
          include: {
            sports: true,
            memberships: { include: { organization: true, team: true } },
            guardianLinks: { include: { guardianUser: true } },
            coachConnections: {
              where: { status: "APPROVED" },
              include: { coachUser: true },
            },
            metricEntries: {
              include: { metricDefinition: true },
              orderBy: { recordedAt: "desc" },
              take: 8,
            },
            videoReviews: {
              include: { coachUser: true },
              orderBy: { submittedAt: "desc" },
              take: 8,
            },
            legacyAthlete: {
              include: {
                trainingPlans: {
                  include: { _count: { select: { workouts: true } } },
                  orderBy: { updatedAt: "desc" },
                  take: 8,
                },
                workoutSessions: {
                  include: { workout: true },
                  orderBy: { startedAt: "desc" },
                  take: 8,
                },
              },
            },
          },
        },
        athletes: {
          include: {
            athleteProfile: true,
            trainingPlans: { orderBy: { createdAt: "desc" }, take: 5 },
          },
          take: 20,
        },
        trainingPlans: {
          include: { athlete: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
        videoReviewsAsCoach: {
          include: { athleteProfile: true },
          orderBy: { submittedAt: "desc" },
          take: 8,
        },
        directorSportAssignments: {
          where: { isActive: true },
          include: { sport: true, organization: true },
        },
        adminAuditActions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!user) notFound();

  const isSelf = user.id === admin.id;
  const allowlistedRole = allowlistedRoleForEmail(user.email);

  const sports = [
    ...(user.athleteProfile?.sports.map((sport) => sport.sport) ?? []),
    ...(user.athleteProfile?.primarySport
      ? [user.athleteProfile.primarySport]
      : []),
    ...user.athletes.map((athlete) => athlete.sport),
    ...user.directorSportAssignments.map((assignment) => assignment.sport.name),
  ];
  const trainingPlans =
    user.role === "ATHLETE"
      ? (user.athleteProfile?.legacyAthlete?.trainingPlans ?? [])
      : user.trainingPlans;
  const videoReviews =
    user.role === "ATHLETE"
      ? (user.athleteProfile?.videoReviews ?? [])
      : user.videoReviewsAsCoach;

  return (
    <AdminShell
      title={user.name}
      description={`${labelRole(user.role)} · ${user.email}`}
      action={
        <Badge variant={user.isActive ? "secondary" : "outline"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      }
    >
      <div className="mb-4">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/admin/users">← Back to users</Link>}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Account" icon={UserRound}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Name</dt>
                <dd className="font-semibold">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="font-semibold break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Created</dt>
                <dd className="font-semibold">{user.createdAt.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Last active</dt>
                <dd className="font-semibold">
                  {user.lastActiveAt?.toLocaleString() ?? "Not recorded yet"}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Organization" icon={Building2}>
            {user.organizationMemberships.length === 0 &&
            (user.athleteProfile?.memberships.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">
                No organization relationship.
              </p>
            ) : (
              <div className="space-y-2">
                {user.organizationMemberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div>
                      <Link
                        href={`/admin/organizations/${membership.organizationId}`}
                        className="font-semibold hover:text-brand"
                      >
                        {membership.organization.name}
                      </Link>
                      <p className="text-xs text-slate-500">{membership.role}</p>
                    </div>
                    <form
                      action={removeUserOrganizationAction.bind(
                        null,
                        membership.id,
                        user.id,
                      )}
                    >
                      <Button size="sm" variant="ghost" type="submit">
                        Remove
                      </Button>
                    </form>
                  </div>
                ))}
                {user.athleteProfile?.memberships.map((membership) => (
                  <div key={membership.id} className="rounded-xl border p-3">
                    <Link
                      href={`/admin/organizations/${membership.organizationId}`}
                      className="font-semibold hover:text-brand"
                    >
                      {membership.organization.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      Athlete membership
                      {membership.team ? ` · ${membership.team.name}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Sports & connections" icon={ShieldCheck}>
            <div className="flex flex-wrap gap-2">
              {[...new Set(sports)].map((sport) => (
                <Badge key={sport} variant="outline">
                  {sport}
                </Badge>
              ))}
              {sports.length === 0 ? (
                <span className="text-sm text-slate-500">No sport configured.</span>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {user.athleteProfile?.coachConnections.map((connection) => (
                <div key={connection.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="font-semibold">{connection.coachUser.name}</p>
                  <p className="text-xs text-slate-500">Approved coach connection</p>
                </div>
              ))}
              {user.athleteProfile?.guardianLinks.map((link) => (
                <div key={link.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="font-semibold">{link.guardianUser.name}</p>
                  <p className="text-xs text-slate-500">
                    Guardian · {link.relationship}
                  </p>
                </div>
              ))}
              {user.athletes.slice(0, 8).map((athlete) => (
                <div key={athlete.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="font-semibold">
                    {athlete.firstName} {athlete.lastName}
                  </p>
                  <p className="text-xs text-slate-500">Roster athlete · {athlete.sport}</p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Training" icon={Dumbbell}>
              {trainingPlans.length === 0 ? (
                <p className="text-sm text-slate-500">No training plans.</p>
              ) : (
                <div className="space-y-2">
                  {trainingPlans.slice(0, 8).map((plan) => (
                    <div key={plan.id} className="rounded-xl border p-3 text-sm">
                      <p className="font-semibold">{plan.title}</p>
                      <p className="text-xs text-slate-500">
                        {plan.status} · Updated {plan.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Videos" icon={Film}>
              {videoReviews.length === 0 ? (
                <p className="text-sm text-slate-500">No video review activity.</p>
              ) : (
                <div className="space-y-2">
                  {videoReviews.slice(0, 8).map((review) => (
                    <div key={review.id} className="rounded-xl border p-3 text-sm">
                      <p className="font-semibold">{review.title}</p>
                      <p className="text-xs text-slate-500">
                        {review.status} · {review.submittedAt.toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {user.role === "ATHLETE" ? (
            <Panel title="Progress" icon={Trophy}>
              {(user.athleteProfile?.metricEntries.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">No progress entries.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {user.athleteProfile?.metricEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        {entry.metricDefinition.name}
                      </p>
                      <p className="font-heading text-xl font-bold">
                        {entry.value} {entry.metricDefinition.unit}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          ) : null}

          <Panel title="Recent admin changes" icon={Activity}>
            {user.adminAuditActions.length === 0 ? (
              <p className="text-sm text-slate-500">
                This user has not performed Platform Admin changes.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {user.adminAuditActions.map((event) => (
                  <div key={event.id} className="rounded-xl border p-3">
                    <p className="font-semibold">{event.summary}</p>
                    <p className="text-xs text-slate-500">
                      {event.createdAt.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-lg font-bold">Account controls</h2>
            <div className="mt-4 space-y-3">
              {allowlistedRole ? (
                <AdminAllowlistNote
                  email={user.email}
                  envVar={ALLOWLIST_ENV_VARS[allowlistedRole]}
                  roleLabel={labelRole(allowlistedRole)}
                />
              ) : null}
              <AdminRoleForm
                userId={user.id}
                currentRole={user.role}
                isSelf={isSelf}
              />
              <AdminActivationForm
                userId={user.id}
                isActive={user.isActive}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Deactivation preserves all historical training and activity and
              invalidates server-side access.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-lg font-bold">
              Assign organization
            </h2>
            <form
              action={assignUserOrganizationAction.bind(null, user.id)}
              className="mt-4 space-y-3"
            >
              <select
                name="organizationId"
                required
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Choose organization</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <select
                name="orgRole"
                defaultValue="COACH"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="COACH">Coach</option>
                <option value="STAFF">Staff</option>
              </select>
              <Button type="submit" className="w-full">
                Assign
              </Button>
            </form>
          </section>

          {user.role === "TRAINER" ? (
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href={`/admin/directors/${user.id}`}>Director detail</Link>}
            />
          ) : null}
        </aside>
      </div>
    </AdminShell>
  );
}
