export const CONSENT_DOCUMENT_VERSION = "2026-08-27";
export const AGE_OF_MAJORITY = 18;

export const CONSENT_TYPE = {
  TERMS_AND_PRIVACY: "TERMS_AND_PRIVACY",
  PARENTAL_DATA: "PARENTAL_DATA",
  PUBLIC_VIDEO: "PUBLIC_VIDEO",
  PUBLIC_LEADERBOARD: "PUBLIC_LEADERBOARD",
} as const;

export function parseDateOfBirth(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date > new Date()) return null;
  return date;
}

export function ageOn(dateOfBirth: Date, today = new Date()) {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const month = today.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (
    month < 0 ||
    (month === 0 && today.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export function isMinor(dateOfBirth: Date, today = new Date()) {
  return ageOn(dateOfBirth, today) < AGE_OF_MAJORITY;
}
