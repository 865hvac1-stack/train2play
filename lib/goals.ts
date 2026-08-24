import { z } from "zod";

export const GOAL_DIRECTIONS = ["HIGHER", "LOWER"] as const;
export type GoalDirection = (typeof GOAL_DIRECTIONS)[number];

export const progressGoalSchema = z.object({
  label: z.string().min(1, "Metric name is required"),
  targetValue: z.coerce.number().positive("Target must be greater than zero"),
  unit: z.string().min(1, "Unit is required"),
  direction: z.enum(GOAL_DIRECTIONS),
  dueDate: z.string().optional(),
});

export type ProgressGoalInput = z.infer<typeof progressGoalSchema>;

export function evaluateGoalProgress(options: {
  current: number | null;
  target: number;
  direction: GoalDirection;
}) {
  if (options.current == null) {
    return { met: false, progressPercent: 0, gap: null as number | null };
  }

  const { current, target, direction } = options;

  if (direction === "HIGHER") {
    const met = current >= target;
    const progressPercent = Math.min(100, Math.round((current / target) * 100));
    return { met, progressPercent, gap: target - current };
  }

  const met = current <= target;
  const progressPercent = Math.min(
    100,
    Math.round((target / current) * 100),
  );
  return { met, progressPercent, gap: current - target };
}

export function formatGoalDirection(direction: GoalDirection) {
  return direction === "HIGHER" ? "Higher is better" : "Lower is better";
}
