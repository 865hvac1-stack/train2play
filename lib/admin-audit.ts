import { prisma } from "@/lib/db";

export async function writeAdminAudit(options: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.adminAuditLog.create({
    data: {
      actorUserId: options.actorUserId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      summary: options.summary,
      metadataJson: options.metadata
        ? JSON.stringify(options.metadata)
        : undefined,
    },
  });
}
