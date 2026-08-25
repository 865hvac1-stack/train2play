import { prisma } from "@/lib/db";

export const NOTIFICATION_TYPE = {
  VIDEO_SUBMITTED: "VIDEO_SUBMITTED",
  VIDEO_REVIEWED: "VIDEO_REVIEWED",
  VIDEO_TRAINING_ASSIGNED: "VIDEO_TRAINING_ASSIGNED",
  COACH_CONNECTION: "COACH_CONNECTION",
  PROGRAM_ASSIGNED: "PROGRAM_ASSIGNED",
  PERSONAL_RECORD: "PERSONAL_RECORD",
  ACHIEVEMENT: "ACHIEVEMENT",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export async function createNotification(options: {
  userId: string;
  type: NotificationType | string;
  title: string;
  body?: string;
  href?: string;
  entityId?: string;
  entityType?: string;
}) {
  return prisma.appNotification.create({
    data: {
      userId: options.userId,
      type: options.type,
      title: options.title,
      body: options.body ?? null,
      href: options.href ?? null,
      entityId: options.entityId ?? null,
      entityType: options.entityType ?? null,
    },
  });
}

export async function listNotificationsForUser(userId: string, take = 30) {
  return prisma.appNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.appNotification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.appNotification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.appNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
