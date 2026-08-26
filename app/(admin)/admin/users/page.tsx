import { Search, Users } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db";

const ROLE_TABS = [
  ["ALL", "All"],
  ["ATHLETE", "Athletes"],
  ["COACH", "Coaches"],
  ["TRAINER", "Directors"],
  ["PARENT", "Guardians"],
  ["PLATFORM_ADMIN", "Platform Admins"],
] as const;

function roleWhere(role?: string) {
  if (!role || role === "ALL") return {};
  if (role === "COACH") {
    return { role: { in: ["COACH", "STAFF", "ORG_ADMIN"] as const } };
  }
  return { role: role as "ATHLETE" | "TRAINER" | "PARENT" | "PLATFORM_ADMIN" };
}

function roleLabel(role: string) {
  return role === "TRAINER"
    ? "Director"
    : role === "PARENT"
      ? "Guardian"
      : role.replaceAll("_", " ").toLowerCase();
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
    search?: string;
    status?: string;
    page?: string;
    attention?: string;
    journey?: string;
  }>;
}) {
  const query = await searchParams;
  const role = query.role ?? "ALL";
  const search = query.search?.trim() ?? "";
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = 30;
  const statusWhere =
    query.status === "inactive"
      ? { isActive: false }
      : query.status === "active"
        ? { isActive: true }
        : {};

  const journeyWhere =
    query.journey === "connected"
      ? {
          athleteProfile: {
            is: {
              OR: [
                { coachConnections: { some: { status: "APPROVED" } } },
                { memberships: { some: { coachUserId: { not: null } } } },
                { legacyAthlete: { isNot: null } },
              ],
            },
          },
        }
      : query.journey === "assigned"
        ? {
            athleteProfile: {
              is: {
                legacyAthlete: {
                  is: { trainingPlans: { some: { status: "ACTIVE" } } },
                },
              },
            },
          }
        : query.journey === "first-workout"
          ? {
              athleteProfile: {
                is: {
                  legacyAthlete: {
                    is: {
                      workoutSessions: { some: { status: "COMPLETED" } },
                    },
                  },
                },
              },
            }
          : query.journey === "active"
            ? { lastActiveAt: { gte: new Date(Date.now() - 30 * 86400000) } }
            : query.journey === "progress"
              ? {
                  athleteProfile: {
                    is: {
                      OR: [
                        { metricEntries: { some: {} } },
                        {
                          legacyAthlete: {
                            is: { progressMetrics: { some: {} } },
                          },
                        },
                      ],
                    },
                  },
                }
              : {};

  const attentionWhere =
    query.attention === "unconnected"
      ? {
          athleteProfile: {
            is: {
              AND: [
                { coachConnections: { none: { status: "APPROVED" } } },
                { memberships: { none: { coachUserId: { not: null } } } },
                { legacyAthlete: { is: null } },
              ],
            },
          },
        }
      : query.attention === "no-training"
        ? {
            athleteProfile: {
              is: {
                OR: [
                  { legacyAthlete: { is: null } },
                  {
                    legacyAthlete: {
                      is: { trainingPlans: { none: { status: "ACTIVE" } } },
                    },
                  },
                ],
              },
            },
          }
        : query.attention === "inactive"
          ? {
              athletes: { some: {} },
              trainingPlans: {
                none: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
              },
            }
          : query.attention === "not-activated"
            ? {
                createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
                athleteProfile: {
                  is: {
                    OR: [
                      { legacyAthlete: { is: null } },
                      {
                        legacyAthlete: {
                          is: {
                            workoutSessions: { none: { status: "COMPLETED" } },
                          },
                        },
                      },
                    ],
                  },
                },
              }
            : {};

  const where = {
    ...roleWhere(role),
    ...statusWhere,
    ...journeyWhere,
    ...attentionWhere,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            {
              organizationMemberships: {
                some: {
                  organization: {
                    name: { contains: search, mode: "insensitive" as const },
                  },
                },
              },
            },
            {
              athleteProfile: {
                is: {
                  OR: [
                    {
                      primarySport: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      sports: {
                        some: {
                          sport: {
                            contains: search,
                            mode: "insensitive" as const,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastActiveAt: true,
        organizationMemberships: {
          select: { organization: { select: { name: true } } },
          take: 2,
        },
        athleteProfile: {
          select: {
            primarySport: true,
            sports: { select: { sport: true }, take: 3 },
          },
        },
        athletes: { select: { sport: true }, take: 5 },
        directorSportAssignments: {
          where: { isActive: true },
          select: { sport: { select: { name: true } } },
          take: 5,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (role !== "ALL") params.set("role", role);
    if (search) params.set("search", search);
    if (query.status) params.set("status", query.status);
    if (query.attention) params.set("attention", query.attention);
    if (query.journey) params.set("journey", query.journey);
    params.set("page", String(nextPage));
    return `/admin/users?${params}`;
  }

  return (
    <AdminShell
      title="Users"
      description="Search and operate every Train2Play account."
    >
      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={role === value ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link
                href={`/admin/users${value === "ALL" ? "" : `?role=${value}`}`}
              >
                {label}
              </Link>
            }
          />
        ))}
      </div>

      <form className="mt-4 flex max-w-2xl gap-2">
        {role !== "ALL" ? <input type="hidden" name="role" value={role} /> : null}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search name, email, organization, or sport"
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {(query.attention || query.journey) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-orange-50 p-3 text-sm">
          <Badge>Filtered result</Badge>
          <span>
            {query.attention
              ? `Attention: ${query.attention.replaceAll("-", " ")}`
              : `Journey: ${query.journey?.replaceAll("-", " ")}`}
          </span>
          <Link href="/admin/users" className="font-semibold text-brand">
            Clear
          </Link>
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold">{total.toLocaleString()} accounts</p>
          <div className="flex gap-1">
            {["all", "active", "inactive"].map((value) => (
              <Button
                key={value}
                size="sm"
                variant={(query.status ?? "all") === value ? "secondary" : "ghost"}
                nativeButton={false}
                render={
                  <Link
                    href={`/admin/users?${new URLSearchParams({
                      ...(role !== "ALL" ? { role } : {}),
                      ...(search ? { search } : {}),
                      ...(value !== "all" ? { status: value } : {}),
                    })}`}
                  >
                    {value[0]!.toUpperCase() + value.slice(1)}
                  </Link>
                }
              />
            ))}
          </div>
        </div>
        {users.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-bold">No matching users.</p>
            <p className="text-sm text-slate-500">
              Change the filters or search another name.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Organization</th>
                    <th className="p-3">Sport</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3">Last active</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const sports = [
                      ...(user.athleteProfile?.sports.map((item) => item.sport) ??
                        []),
                      ...(user.athleteProfile?.primarySport
                        ? [user.athleteProfile.primarySport]
                        : []),
                      ...user.athletes.map((athlete) => athlete.sport),
                      ...user.directorSportAssignments.map(
                        (assignment) => assignment.sport.name,
                      ),
                    ];
                    return (
                      <tr key={user.id} className="border-t border-slate-100">
                        <td className="p-3">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="font-semibold text-slate-950 hover:text-brand"
                          >
                            {user.name}
                          </Link>
                          <span className="block text-xs text-slate-500">
                            {user.email}
                          </span>
                        </td>
                        <td className="p-3 capitalize">{roleLabel(user.role)}</td>
                        <td className="p-3 text-slate-600">
                          {user.organizationMemberships
                            .map((item) => item.organization.name)
                            .join(", ") || "—"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {[...new Set(sports)].join(", ") || "—"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {user.createdAt.toLocaleDateString()}
                        </td>
                        <td className="p-3 text-slate-600">
                          {user.lastActiveAt?.toLocaleDateString() ?? "Not recorded"}
                        </td>
                        <td className="p-3">
                          <Badge variant={user.isActive ? "secondary" : "outline"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="block p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Badge variant={user.isActive ? "secondary" : "outline"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 capitalize">
                    {roleLabel(user.role)} · Joined{" "}
                    {user.createdAt.toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          nativeButton={false}
          render={<Link href={pageHref(Math.max(1, page - 1))}>Previous</Link>}
        />
        <p className="text-sm text-slate-500">
          Page {page} of {pages}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pages}
          nativeButton={false}
          render={<Link href={pageHref(Math.min(pages, page + 1))}>Next</Link>}
        />
      </div>
    </AdminShell>
  );
}
