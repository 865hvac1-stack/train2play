import { z } from "zod";

export const onboardingSchema = z.object({
  zipCode: z
    .string()
    .min(5, "Enter a 5-digit zip code")
    .regex(/^\d{5}$/, "Enter a valid US zip code"),
  lookingForSport: z.string().min(1, "Choose your primary sport"),
  searchRadiusMiles: z.coerce.number().int().min(10).max(100),
  lookingForPositions: z.string().optional(),
  pickupAlertsEnabled: z.boolean(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
