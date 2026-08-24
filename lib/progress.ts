import { z } from "zod";

export const METRIC_PRESETS = [
  { label: "40-yard dash", unit: "sec" },
  { label: "Vertical jump", unit: "in" },
  { label: "Broad jump", unit: "in" },
  { label: "Bench press", unit: "lbs" },
  { label: "Squat max", unit: "lbs" },
  { label: "Mile time", unit: "min" },
  { label: "Free throw %", unit: "%" },
  { label: "Body weight", unit: "lbs" },
] as const;

export const progressMetricSchema = z.object({
  label: z.string().min(1, "Metric name is required"),
  value: z.coerce.number().positive("Value must be greater than zero"),
  unit: z.string().min(1, "Unit is required"),
  recordedAt: z.string().optional(),
  notes: z.string().optional(),
});

export type ProgressMetricInput = z.infer<typeof progressMetricSchema>;

export function formatMetricValue(value: number, unit: string) {
  const formatted =
    unit === "%" ? value.toFixed(1) : Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${formatted} ${unit}`;
}

export function formatMetricDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
