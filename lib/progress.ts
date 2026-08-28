import { z } from "zod";

export const METRIC_PRESETS = [
  { label: "Throwing velo", unit: "mph" },
  { label: "Bat speed", unit: "mph" },
  { label: "Exit velo", unit: "mph" },
  { label: "60-yard dash", unit: "sec" },
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
  return `${formatMetricNumber(value, unit)} ${unit}`;
}

export function formatMetricNumber(value: number, unit: string) {
  if (unit === "%") return value.toFixed(1);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatMetricDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRelativeActivityDate(date: Date, now = new Date()) {
  const startOfDay = (value: Date) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return formatMetricDate(date);
}
