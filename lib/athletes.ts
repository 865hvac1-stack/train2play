import { z } from "zod";

export const athleteSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  sport: z.string().min(1, "Sport is required"),
  position: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  inviteEmail: z
    .union([z.string().email("Enter a valid invite email"), z.literal("")])
    .optional(),
});

export type AthleteInput = z.infer<typeof athleteSchema>;

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
