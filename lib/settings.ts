import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must include a letter")
      .regex(/[0-9]/, "Password must include a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const pickupAlertSettingsSchema = z.object({
  zipCode: z
    .string()
    .min(5, "Enter a 5-digit zip code")
    .regex(/^\d{5}$/, "Enter a valid US zip code"),
  searchRadiusMiles: z.coerce.number().int().min(5).max(100),
  pickupAlertsEnabled: z.boolean(),
  lookingForSport: z.string().optional(),
  lookingForPositions: z.string().optional(),
  minThrowingVelo: z.coerce.number().positive().optional(),
});

export type PickupAlertSettingsInput = z.infer<typeof pickupAlertSettingsSchema>;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getEmailFromAddress() {
  return process.env.EMAIL_FROM ?? "Train2Play <noreply@train2play.com>";
}
