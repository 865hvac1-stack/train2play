import webpush from "web-push";

import { prisma } from "@/lib/db";

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

export function isPushConfigured() {
  return Boolean(
    getVapidPublicKey() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      (process.env.VAPID_SUBJECT?.trim() || process.env.EMAIL_FROM?.trim()),
  );
}

function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:support@train2play.com";
  webpush.setVapidDetails(
    subject.startsWith("mailto:") ? subject : `mailto:${subject}`,
    publicKey,
    privateKey,
  );
  return true;
}

export async function sendPushToUser(options: {
  userId: string;
  title: string;
  body?: string | null;
  url: string;
}): Promise<{ sent: number }> {
  if (!configureWebPush()) return { sent: 0 };
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: options.userId },
  });
  if (subscriptions.length === 0) return { sent: 0 };

  const payload = JSON.stringify({
    title: options.title,
    body: options.body ?? "",
    url: options.url,
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: row.id } }).catch(() => undefined);
        } else {
          console.error("[train2play] push send failed", status);
        }
      }
    }),
  );
  return { sent };
}
