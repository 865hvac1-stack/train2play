export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
] as const;

export type UsStateCode = (typeof US_STATES)[number]["code"];

/** Youth competition age groups used on Player Profiles and leaderboards. */
export const AGE_GROUPS = [
  { id: "8U", label: "8U", maxAge: 8 },
  { id: "10U", label: "10U", maxAge: 10 },
  { id: "12U", label: "12U", maxAge: 12 },
  { id: "14U", label: "14U", maxAge: 14 },
  { id: "16U", label: "16U", maxAge: 16 },
  { id: "18U", label: "18U", maxAge: 18 },
  { id: "19+", label: "19+", maxAge: 99 },
] as const;

export type AgeGroupId = (typeof AGE_GROUPS)[number]["id"];

export function ageGroupFromAge(age: number | null | undefined): AgeGroupId | null {
  if (age == null || age < 0 || age > 80) return null;
  for (const group of AGE_GROUPS) {
    if (age <= group.maxAge) return group.id;
  }
  return "19+";
}

export function ageGroupLabel(id: string | null | undefined) {
  return AGE_GROUPS.find((group) => group.id === id)?.label ?? id ?? null;
}

export function stateName(code: string | null | undefined) {
  if (!code) return null;
  const match = US_STATES.find(
    (state) => state.code === code.toUpperCase() || state.name.toLowerCase() === code.toLowerCase(),
  );
  return match?.name ?? null;
}

export function normalizeStateCode(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const match = US_STATES.find(
    (state) =>
      state.code === trimmed.toUpperCase() ||
      state.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return match?.code ?? null;
}

export const LEADERBOARD_PERIODS = [
  { id: "7d", label: "This week", days: 7 },
  { id: "30d", label: "This month", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "year", label: "This year", days: 366 },
  { id: "all", label: "All time", days: null },
] as const;

export type LeaderboardPeriodId = (typeof LEADERBOARD_PERIODS)[number]["id"];

export function periodStart(period: string, now = new Date()) {
  const def = LEADERBOARD_PERIODS.find((item) => item.id === period);
  if (!def || def.days == null) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - def.days);
  return start;
}

export function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
