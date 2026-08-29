import { getAppUrl } from "@/lib/env";

export function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export function buildAlertSms(options: {
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  const url = options.href ? `${getAppUrl()}${options.href}` : getAppUrl();
  const detail = options.body?.trim();
  const line = detail
    ? `${options.title}: ${detail}`
    : options.title;
  const text = `${line} Open Train2Play: ${url}`;
  return text.length > 300 ? `${options.title} Open Train2Play: ${url}` : text;
}

export async function sendSmsAlert(options: {
  toE164: string;
  body: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isSmsConfigured()) {
    return { sent: false, reason: "SMS is not configured" };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: options.toE164,
        From: from,
        Body: options.body,
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[train2play] SMS send failed", response.status, detail.slice(0, 180));
    return { sent: false, reason: "SMS provider rejected the message" };
  }
  return { sent: true };
}
