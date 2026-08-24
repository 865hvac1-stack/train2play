export const ROSTER_STATUSES = ["ROSTER", "PICKUP"] as const;
export type RosterStatus = (typeof ROSTER_STATUSES)[number];

/** Headline metrics shown on player profiles with system-wide comparison. */
export const PROFILE_METRICS = [
  {
    label: "Throwing velo",
    unit: "mph",
    direction: "HIGHER" as const,
    shortLabel: "Throwing",
  },
  {
    label: "Bat speed",
    unit: "mph",
    direction: "HIGHER" as const,
    shortLabel: "Bat speed",
  },
  {
    label: "Exit velo",
    unit: "mph",
    direction: "HIGHER" as const,
    shortLabel: "Exit velo",
  },
  {
    label: "60-yard dash",
    unit: "sec",
    direction: "LOWER" as const,
    shortLabel: "60-yard",
  },
] as const;

export type ProfileMetricConfig = (typeof PROFILE_METRICS)[number];

export type ProfileStatComparison = {
  label: string;
  shortLabel: string;
  unit: string;
  direction: "HIGHER" | "LOWER";
  value: number | null;
  recordedAt: Date | null;
  systemAverage: number | null;
  sampleSize: number;
  delta: number | null;
  percentile: number | null;
};

export function normalizeMetricLabel(label: string) {
  return label.trim().toLowerCase();
}

export function formatComparisonDelta(
  delta: number | null,
  unit: string,
  direction: "HIGHER" | "LOWER",
) {
  if (delta === null) return null;
  const signed =
    direction === "HIGHER"
      ? delta >= 0
        ? `+${delta.toFixed(1)}`
        : delta.toFixed(1)
      : delta <= 0
        ? `${delta.toFixed(1)}`
        : `+${delta.toFixed(1)}`;
  return `${signed} ${unit} vs avg`;
}

export function comparisonTone(delta: number | null, direction: "HIGHER" | "LOWER") {
  if (delta === null) return "neutral" as const;
  if (direction === "HIGHER") {
    if (delta > 0.5) return "positive" as const;
    if (delta < -0.5) return "negative" as const;
    return "neutral" as const;
  }
  if (delta < -0.05) return "positive" as const;
  if (delta > 0.05) return "negative" as const;
  return "neutral" as const;
}

export function getLatestMetricForLabel<
  T extends { label: string; value: number; unit: string; recordedAt: Date },
>(metrics: T[], label: string) {
  const normalized = normalizeMetricLabel(label);
  return metrics
    .filter((metric) => normalizeMetricLabel(metric.label) === normalized)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
}

export function computePercentile(
  value: number,
  samples: number[],
  direction: "HIGHER" | "LOWER",
) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  if (direction === "HIGHER") {
    const below = sorted.filter((sample) => sample <= value).length;
    return Math.round((below / sorted.length) * 100);
  }
  const above = sorted.filter((sample) => sample >= value).length;
  return Math.round((above / sorted.length) * 100);
}
