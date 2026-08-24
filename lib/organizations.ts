import { OrgRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

export const DEFAULT_ORG_SLUG = "nexgen";
export const DEFAULT_ORG_NAME = "NexGen";

export async function ensureDefaultOrganization() {
  return prisma.organization.upsert({
    where: { slug: DEFAULT_ORG_SLUG },
    update: {},
    create: {
      name: DEFAULT_ORG_NAME,
      slug: DEFAULT_ORG_SLUG,
      primaryColor: "#FF6600",
    },
  });
}

export async function getDefaultOrganization() {
  const org = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
  });

  if (org) return org;
  return ensureDefaultOrganization();
}

export async function ensureOrganizationMembership(
  userId: string,
  role: OrgRole = OrgRole.COACH,
) {
  const organization = await getDefaultOrganization();

  return prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId,
      role,
    },
  });
}

export async function getUserOrganizationIds(userId: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId },
    select: { organizationId: true },
  });

  return memberships.map((membership) => membership.organizationId);
}
