import { z } from "zod";

export const PLAN_STATUSES = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const trainingPlanSchema = z.object({
  title: z.string().min(1, "Plan title is required"),
  description: z.string().optional(),
  athleteId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type TrainingPlanInput = z.infer<typeof trainingPlanSchema>;

export const workoutSchema = z.object({
  title: z.string().min(1, "Workout title is required"),
  description: z.string().optional(),
  scheduledDate: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;

export function formatPlanStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}

export function planStatusVariant(
  status: string,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "COMPLETED":
      return "secondary";
    default:
      return "outline";
  }
}
