/**
 * Railway environment allowlists. PLATFORM_ADMIN_EMAIL and TRAINER_EMAILS
 * promote accounts at sign-in, which means they also override role changes made
 * in Admin → Users. Anything that reads or explains those variables uses this.
 */
export type AllowlistedRole = "PLATFORM_ADMIN" | "TRAINER";

export const ALLOWLIST_ENV_VARS: Record<AllowlistedRole, string> = {
  PLATFORM_ADMIN: "PLATFORM_ADMIN_EMAIL",
  TRAINER: "TRAINER_EMAILS",
};

export function splitEmailList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

/** Platform admin wins when an email appears in both variables. */
export function allowlistedRoleForEmail(
  email: string | null | undefined,
): AllowlistedRole | null {
  if (!email) return null;
  const lowered = email.toLowerCase();
  if (splitEmailList(process.env.PLATFORM_ADMIN_EMAIL).includes(lowered)) {
    return "PLATFORM_ADMIN";
  }
  if (splitEmailList(process.env.TRAINER_EMAILS).includes(lowered)) {
    return "TRAINER";
  }
  return null;
}
