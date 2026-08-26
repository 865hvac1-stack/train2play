import { z } from "zod";

export const SPORTS = [
  "Baseball",
  "Basketball",
  "Football",
  "Soccer",
  "Softball",
  "Track & Field",
  "Volleyball",
  "Wrestling",
  "Other",
] as const;

export type SportName = (typeof SPORTS)[number];

export function isKnownSport(value: string): value is SportName {
  return (SPORTS as readonly string[]).includes(value);
}

export function parseSportsFromFormData(formData: FormData) {
  const selected = formData
    .getAll("sports")
    .map((value) => String(value).trim())
    .filter(isKnownSport);
  const unique = [...new Set(selected)];
  const requestedPrimary = String(formData.get("primarySport") ?? "").trim();
  const primarySport = unique.includes(requestedPrimary as SportName)
    ? requestedPrimary
    : (unique[0] ?? "");
  return { sports: unique, primarySport };
}

export const athleteSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  sport: z.string().min(1, "Select at least one sport"),
  sports: z.array(z.string()).min(1, "Select at least one sport"),
  position: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  inviteEmail: z
    .union([z.string().email("Enter a valid invite email"), z.literal("")])
    .optional(),
});

export type AthleteInput = z.infer<typeof athleteSchema>;
