import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { buildAlertSms, sendSmsAlert } from "@/lib/sms";

const SMS_TYPES = new Set([
  "VIDEO_REVIEWED",
  "VIDEO_TRAINING_ASSIGNED",
  "VIDEO_SUBMITTED",
  "COACH_CONNECTION",
  "PROGRAM_ASSIGNED",
]);

export async function deliverOutOfAppAlert(notification: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  const href = notification.href || "/launch";
  const push = await sendPushToUser({
    userId: notification.userId,
    title: notification.title,
    body: notification.body,
    url: href,
  });
  if (push.sent > 0) {
    await prisma.appNotification.update({
      where: { id: notification.id },
      data: { pushSentAt: new Date() },
    });
  }

  if (!SMS_TYPES.has(notification.type)) return;

  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { phoneE164: true, smsAlertsEnabled: true },
  });
  if (!user?.smsAlertsEnabled || !user.phoneE164) return;

  const sms = await sendSmsAlert({
    toE164: user.phoneE164,
    body: buildAlertSms({
      title: notification.title,
      body: notification.body,
      href,
    }),
  });
  if (sms.sent) {
    await prisma.appNotification.update({
      where: { id: notification.id },
      data: { smsSentAt: new Date() },
    });
  }
}
