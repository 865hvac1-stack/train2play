export type AgeBandId = "8-10" | "11-13" | "14-16" | "17-18" | "adult";

export type Drill = {
  id: string;
  title: string;
  focus: string;
  durationMin: number;
  equipment: string;
  howTo: string;
  coachingCue: string;
  videoUrl?: string | null;
  sport?: string;
  /** Set when a director or coach sent this drill straight to the athlete. */
  sentByName?: string | null;
  sentAt?: Date | null;
};

export type AgeBand = {
  id: AgeBandId;
  label: string;
  minAge: number;
  maxAge: number;
};

export const AGE_BANDS: AgeBand[] = [
  { id: "8-10", label: "Ages 8–10", minAge: 8, maxAge: 10 },
  { id: "11-13", label: "Ages 11–13", minAge: 11, maxAge: 13 },
  { id: "14-16", label: "Ages 14–16", minAge: 14, maxAge: 16 },
  { id: "17-18", label: "Ages 17–18", minAge: 17, maxAge: 18 },
  { id: "adult", label: "19+", minAge: 19, maxAge: 99 },
];

export function ageFromDateOfBirth(
  dateOfBirth: Date | null | undefined,
): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age < 120 ? age : null;
}

export function ageBandFromAge(age: number | null): AgeBand {
  if (age === null) {
    return AGE_BANDS.find((band) => band.id === "14-16")!;
  }
  for (const band of AGE_BANDS) {
    if (age >= band.minAge && age <= band.maxAge) return band;
  }
  if (age < 8) return AGE_BANDS[0]!;
  return AGE_BANDS[AGE_BANDS.length - 1]!;
}
