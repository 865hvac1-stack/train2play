"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { writeAdminAudit } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/generated/prisma/client";
import {
  ALLOWLIST_ENV_VARS,
  allowlistedRoleForEmail,
} from "@/lib/role-allowlist";
import { requirePlatformAdmin } from "@/lib/session";

const USER_ROLES = [
  "ATHLETE",
  "COACH",
  "TRAINER",
  "PARENT",
  "STAFF",
  "ORG_ADMIN",
  "PLATFORM_ADMIN",
] as const satisfies readonly UserRole[];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type AdminAccountActionState = { error?: string; success?: string };

function labelRole(role: UserRole) {
  return role === "TRAINER"
    ? "Director"
    : role === "PARENT"
      ? "Guardian"
      : role === "PLATFORM_ADMIN"
        ? "Platform Admin"
        : role === "ORG_ADMIN"
          ? "Organization Admin"
          : role.charAt(0) + role.slice(1).toLowerCase();
}

/**
 * The Railway allowlist re-promotes at sign-in, so a role saved here can be
 * overwritten. Say so instead of letting the change quietly revert.
 */
function allowlistWarning(email: string, savedRole: UserRole) {
  const allowlisted = allowlistedRoleForEmail(email);
  if (!allowlisted || allowlisted === savedRole) return "";
  return ` Heads up: ${email} is listed in ${ALLOWLIST_ENV_VARS[allowlisted]} on Railway, so this account returns to ${labelRole(allowlisted)} at its next sign-in. Remove the email from that variable to make this stick.`;
}

export async function setUserActiveAction(
  userId: string,
  active: boolean,
  _previous: AdminAccountActionState,
  _formData: FormData,
): Promise<AdminAccountActionState> {
  const admin = await requirePlatformAdmin();
  if (userId === admin.id && !active) {
    return {
      error:
        "You cannot deactivate your own account. Ask another Platform Admin to do it.",
    };
  }
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, isActive: true },
  });
  if (!target) return { error: "That account no longer exists." };
  if (!active && target.role === "PLATFORM_ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: { role: "PLATFORM_ADMIN", isActive: true },
    });
    if (activeAdmins <= 1) {
      return {
        error:
          "Train2Play must keep at least one active Platform Admin. Promote a second admin first.",
      };
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        isActive: active,
        deactivatedAt: active ? null : new Date(),
        sessionVersion: { increment: 1 },
      },
    });
    await tx.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        entityType: "USER",
        entityId: userId,
        summary: `${active ? "Activated" : "Deactivated"} ${target.name} (${target.email})`,
        metadataJson: JSON.stringify({ previousActive: target.isActive }),
      },
    });
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/directors");
  revalidatePath(`/admin/directors/${userId}`);
  return {
    success: `${target.name} is now ${active ? "active" : "deactivated"}.`,
  };
}

export async function changeUserRoleAction(
  userId: string,
  _previous: AdminAccountActionState,
  formData: FormData,
): Promise<AdminAccountActionState> {
  const admin = await requirePlatformAdmin();
  const parsed = z.enum(USER_ROLES).safeParse(formData.get("role"));
  if (!parsed.success) return { error: "Pick a role to save." };
  const role = parsed.data;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true },
  });
  if (!target) return { error: "That account no longer exists." };

  if (userId === admin.id && role !== "PLATFORM_ADMIN") {
    return {
      error:
        "You cannot change your own role, because it would lock you out of Platform Admin. Promote a second Platform Admin and have them make the change.",
    };
  }
  if (target.role === "PLATFORM_ADMIN" && role !== "PLATFORM_ADMIN") {
    const remainingAdmins = await prisma.user.count({
      where: { role: "PLATFORM_ADMIN", isActive: true, id: { not: userId } },
    });
    if (remainingAdmins === 0) {
      return {
        error:
          "Train2Play must keep at least one Platform Admin. Promote a replacement first.",
      };
    }
  }
  if (target.role === role) {
    return {
      success: `No change — ${target.name} is already ${labelRole(role)}.${allowlistWarning(target.email, role)}`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        role,
        onboardingCompletedAt:
          role === "TRAINER" || role === "PLATFORM_ADMIN"
            ? new Date()
            : undefined,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: "USER_ROLE_CHANGED",
        entityType: "USER",
        entityId: userId,
        summary: `Changed ${target.name} from ${target.role} to ${role}`,
        metadataJson: JSON.stringify({ from: target.role, to: role }),
      },
    });
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/directors");
  revalidatePath(`/admin/directors/${userId}`);
  return {
    success: `${target.name} is now ${labelRole(role)}.${allowlistWarning(target.email, role)}`,
  };
}

export async function assignUserOrganizationAction(
  userId: string,
  formData: FormData,
) {
  const admin = await requirePlatformAdmin();
  const organizationId = z.string().min(1).parse(formData.get("organizationId"));
  const role = z
    .enum(["OWNER", "ADMIN", "COACH", "STAFF"])
    .parse(formData.get("orgRole"));
  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
  ]);
  if (!user || !organization) throw new Error("User or organization not found");
  await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    create: { organizationId, userId, role },
    update: { role },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "ORGANIZATION_USER_ASSIGNED",
    entityType: "ORGANIZATION",
    entityId: organizationId,
    summary: `Assigned ${user.name} to ${organization.name} as ${role}`,
    metadata: { userId, role },
  });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/admin/organizations/${organizationId}`);
}

export async function removeUserOrganizationAction(
  membershipId: string,
  userId: string,
) {
  const admin = await requirePlatformAdmin();
  const membership = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
    include: {
      user: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });
  if (!membership) return;
  await prisma.organizationMembership.delete({ where: { id: membershipId } });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "ORGANIZATION_USER_REMOVED",
    entityType: "ORGANIZATION",
    entityId: membership.organizationId,
    summary: `Removed ${membership.user.name} from ${membership.organization.name}`,
    metadata: { userId },
  });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/admin/organizations/${membership.organizationId}`);
}

export async function createOrganizationAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(100),
      slug: z.string().trim().optional(),
      primaryColor: z.string().trim().optional(),
    })
    .parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      primaryColor: formData.get("primaryColor"),
    });
  const baseSlug = slugify(parsed.slug || parsed.name);
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }
  const organization = await prisma.organization.create({
    data: {
      name: parsed.name,
      slug,
      primaryColor: parsed.primaryColor || null,
    },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "ORGANIZATION_CREATED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
    summary: `Created organization ${organization.name}`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  redirect(`/admin/organizations/${organization.id}`);
}

export async function updateOrganizationAction(
  organizationId: string,
  formData: FormData,
) {
  const admin = await requirePlatformAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(100),
      primaryColor: z.string().trim().optional(),
    })
    .parse({
      name: formData.get("name"),
      primaryColor: formData.get("primaryColor"),
    });
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: parsed.name,
      primaryColor: parsed.primaryColor || null,
    },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "ORGANIZATION_UPDATED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
    summary: `Updated organization ${organization.name}`,
  });
  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organization.id}`);
}

export async function setOrganizationActiveAction(
  organizationId: string,
  active: boolean,
) {
  const admin = await requirePlatformAdmin();
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      isActive: active,
      deactivatedAt: active ? null : new Date(),
    },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: active ? "ORGANIZATION_ACTIVATED" : "ORGANIZATION_DEACTIVATED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
    summary: `${active ? "Activated" : "Deactivated"} ${organization.name}`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organization.id}`);
}

export async function assignDirectorSportAction(
  directorUserId: string,
  formData: FormData,
) {
  const admin = await requirePlatformAdmin();
  const sportId = z.string().min(1).parse(formData.get("sportId"));
  const organizationId = String(formData.get("organizationId") ?? "") || null;
  const [director, sport, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: directorUserId },
      select: { name: true, role: true },
    }),
    prisma.platformSport.findUnique({
      where: { id: sportId },
      select: { name: true },
    }),
    organizationId
      ? prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);
  if (!director || director.role !== "TRAINER" || !sport) {
    throw new Error("Director or sport not found");
  }
  const existing = await prisma.directorSportAssignment.findFirst({
    where: { directorUserId, sportId, organizationId },
  });
  if (existing) {
    await prisma.directorSportAssignment.update({
      where: { id: existing.id },
      data: { isActive: true, assignedById: admin.id },
    });
  } else {
    await prisma.directorSportAssignment.create({
      data: {
        directorUserId,
        sportId,
        organizationId,
        assignedById: admin.id,
      },
    });
  }
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "DIRECTOR_SPORT_ASSIGNED",
    entityType: "USER",
    entityId: directorUserId,
    summary: `Assigned ${director.name} to ${sport.name}${organization ? ` at ${organization.name}` : " platform-wide"}`,
    metadata: { sportId, organizationId },
  });
  revalidatePath("/admin/directors");
  revalidatePath(`/admin/directors/${directorUserId}`);
  revalidatePath(`/admin/users/${directorUserId}`);
}

export async function createDirectorAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2),
      email: z.string().trim().email(),
      organizationId: z.string().optional(),
    })
    .parse({
      name: formData.get("name"),
      email: formData.get("email"),
      organizationId: String(formData.get("organizationId") ?? ""),
    });
  const email = parsed.email.toLowerCase();
  let director = await prisma.user.findUnique({ where: { email } });
  if (director) {
    director = await prisma.user.update({
      where: { id: director.id },
      data: {
        role: "TRAINER",
        isActive: true,
        deactivatedAt: null,
        onboardingCompletedAt: director.onboardingCompletedAt ?? new Date(),
        sessionVersion: { increment: 1 },
      },
    });
  } else {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    director = await prisma.user.create({
      data: {
        name: parsed.name,
        email,
        passwordHash,
        role: "TRAINER",
        onboardingCompletedAt: new Date(),
      },
    });
  }
  if (parsed.organizationId) {
    await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: parsed.organizationId,
          userId: director.id,
        },
      },
      create: {
        organizationId: parsed.organizationId,
        userId: director.id,
        role: "ADMIN",
      },
      update: { role: "ADMIN" },
    });
  }
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "DIRECTOR_CREATED",
    entityType: "USER",
    entityId: director.id,
    summary: `Created or promoted Director ${director.name} (${director.email})`,
    metadata: { organizationId: parsed.organizationId || null },
  });
  revalidatePath("/admin/directors");
  revalidatePath("/admin/users");
  redirect(`/admin/directors/${director.id}`);
}

export async function removeDirectorSportAction(
  assignmentId: string,
  directorUserId: string,
) {
  const admin = await requirePlatformAdmin();
  const assignment = await prisma.directorSportAssignment.findUnique({
    where: { id: assignmentId },
    include: { directorUser: true, sport: true, organization: true },
  });
  if (!assignment) return;
  await prisma.directorSportAssignment.update({
    where: { id: assignment.id },
    data: { isActive: false },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "DIRECTOR_SPORT_REMOVED",
    entityType: "USER",
    entityId: directorUserId,
    summary: `Removed ${assignment.directorUser.name} from ${assignment.sport.name}${assignment.organization ? ` at ${assignment.organization.name}` : ""}`,
  });
  revalidatePath("/admin/directors");
  revalidatePath(`/admin/directors/${directorUserId}`);
}

export async function createMetricAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2),
      sport: z.string().trim().min(1),
      category: z.string().trim().min(1),
      unit: z.string().trim().min(1),
      direction: z.enum(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"]),
      verificationRequirement: z.string().trim().min(1),
    })
    .parse({
      name: formData.get("name"),
      sport: formData.get("sport"),
      category: formData.get("category"),
      unit: formData.get("unit"),
      direction: formData.get("direction"),
      verificationRequirement:
        formData.get("verificationRequirement") || "NONE",
    });
  const metric = await prisma.metricDefinition.create({
    data: {
      ...parsed,
      slug: slugify(parsed.name),
      leaderboardEligible: formData.get("leaderboardEligible") === "on",
      publicLeaderboardEligible:
        formData.get("publicLeaderboardEligible") === "on",
      isSensitive: formData.get("isSensitive") === "on",
    },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "METRIC_CREATED",
    entityType: "METRIC_DEFINITION",
    entityId: metric.id,
    summary: `Created metric ${metric.name} for ${metric.sport}`,
  });
  revalidatePath("/admin/metrics");
  redirect("/admin/metrics");
}

export async function updateMetricAction(
  metricId: string,
  formData: FormData,
) {
  const admin = await requirePlatformAdmin();
  const leaderboardEligible = formData.get("leaderboardEligible") === "on";
  const isSensitive = formData.get("isSensitive") === "on";
  const publicLeaderboardEligible =
    leaderboardEligible &&
    !isSensitive &&
    formData.get("publicLeaderboardEligible") === "on";
  const metric = await prisma.metricDefinition.update({
    where: { id: metricId },
    data: {
      isActive: formData.get("isActive") === "on",
      leaderboardEligible,
      publicLeaderboardEligible,
      isSensitive,
      verificationRequirement: String(
        formData.get("verificationRequirement") || "NONE",
      ),
    },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "METRIC_UPDATED",
    entityType: "METRIC_DEFINITION",
    entityId: metric.id,
    summary: `Updated metric governance for ${metric.name}`,
  });
  revalidatePath("/admin/metrics");
}

export async function createPlatformSportAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const name = z.string().trim().min(2).max(60).parse(formData.get("name"));
  const count = await prisma.platformSport.count();
  const sport = await prisma.platformSport.create({
    data: { name, slug: slugify(name), sortOrder: count },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "PLATFORM_SPORT_CREATED",
    entityType: "PLATFORM_SPORT",
    entityId: sport.id,
    summary: `Added platform sport ${sport.name}`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/sports");
  redirect(`/admin/sports/${sport.id}`);
}

export async function setPlatformSportActiveAction(
  sportId: string,
  active: boolean,
) {
  const admin = await requirePlatformAdmin();
  const sport = await prisma.platformSport.update({
    where: { id: sportId },
    data: { isActive: active },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: active ? "PLATFORM_SPORT_ACTIVATED" : "PLATFORM_SPORT_DEACTIVATED",
    entityType: "PLATFORM_SPORT",
    entityId: sport.id,
    summary: `${active ? "Activated" : "Deactivated"} platform sport ${sport.name}`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/sports");
  revalidatePath(`/admin/sports/${sport.id}`);
}
