import type { MetricDirection } from "@/lib/generated/prisma/client";

export type MetricDefinitionSeed = {
  sport: string;
  slug: string;
  name: string;
  category: string;
  unit: string;
  direction: MetricDirection;
  inputType?: string;
};

/** Maps legacy ProgressMetric labels to MetricDefinition slugs by sport. */
export const LEGACY_METRIC_LABEL_MAP: Record<string, string> = {
  "throwing velo": "throwing_velocity",
  "bat speed": "bat_speed",
  "exit velo": "exit_velocity",
  "60-yard dash": "sixty_yard_dash",
  "60 yard dash": "sixty_yard_dash",
  "vertical jump": "vertical_jump",
  "free throw %": "free_throw_percentage",
  "free throw percentage": "free_throw_percentage",
  "40-yard dash": "forty_yard_dash",
  "40 yard dash": "forty_yard_dash",
  "pop time": "pop_time",
  "10-yard sprint": "ten_yard_sprint",
  "approach jump": "approach_jump",
  "serve velocity": "serve_velocity",
  "broad jump": "broad_jump",
  "bench press": "bench_press",
  "shuttle": "shuttle",
  "shooting percentage": "shooting_percentage",
};

export const METRIC_DEFINITIONS: MetricDefinitionSeed[] = [
  // Baseball
  {
    sport: "Baseball",
    slug: "throwing_velocity",
    name: "Throwing Velocity",
    category: "speed",
    unit: "mph",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Baseball",
    slug: "exit_velocity",
    name: "Exit Velocity",
    category: "power",
    unit: "mph",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Baseball",
    slug: "bat_speed",
    name: "Bat Speed",
    category: "power",
    unit: "mph",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Baseball",
    slug: "ten_yard_sprint",
    name: "10-Yard Sprint",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  {
    sport: "Baseball",
    slug: "sixty_yard_dash",
    name: "60-Yard Dash",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  {
    sport: "Baseball",
    slug: "pop_time",
    name: "Pop Time",
    category: "skill",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  // Softball (shared metrics)
  {
    sport: "Softball",
    slug: "throwing_velocity",
    name: "Throwing Velocity",
    category: "speed",
    unit: "mph",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Softball",
    slug: "exit_velocity",
    name: "Exit Velocity",
    category: "power",
    unit: "mph",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Softball",
    slug: "bat_speed",
    name: "Bat Speed",
    category: "power",
    unit: "mph",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Softball",
    slug: "sixty_yard_dash",
    name: "60-Yard Dash",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  // Basketball
  {
    sport: "Basketball",
    slug: "shooting_percentage",
    name: "Shooting Percentage",
    category: "skill",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    inputType: "percentage",
  },
  {
    sport: "Basketball",
    slug: "free_throw_percentage",
    name: "Free Throw Percentage",
    category: "skill",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    inputType: "percentage",
  },
  {
    sport: "Basketball",
    slug: "vertical_jump",
    name: "Vertical Jump",
    category: "power",
    unit: "in",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Basketball",
    slug: "sprint_time",
    name: "Sprint Time",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  {
    sport: "Basketball",
    slug: "agility",
    name: "Agility",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  // Volleyball
  {
    sport: "Volleyball",
    slug: "vertical_jump",
    name: "Vertical Jump",
    category: "power",
    unit: "in",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Volleyball",
    slug: "approach_jump",
    name: "Approach Jump",
    category: "power",
    unit: "in",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Volleyball",
    slug: "serve_velocity",
    name: "Serve Velocity",
    category: "power",
    unit: "mph",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Volleyball",
    slug: "agility",
    name: "Agility",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  // Football
  {
    sport: "Football",
    slug: "forty_yard_dash",
    name: "40-Yard Dash",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  {
    sport: "Football",
    slug: "vertical_jump",
    name: "Vertical Jump",
    category: "power",
    unit: "in",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Football",
    slug: "broad_jump",
    name: "Broad Jump",
    category: "power",
    unit: "in",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Football",
    slug: "bench_press",
    name: "Bench Press",
    category: "strength",
    unit: "lbs",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Football",
    slug: "shuttle",
    name: "Shuttle",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  // Soccer
  {
    sport: "Soccer",
    slug: "sprint_time",
    name: "Sprint Time",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  {
    sport: "Soccer",
    slug: "vertical_jump",
    name: "Vertical Jump",
    category: "power",
    unit: "in",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Soccer",
    slug: "agility",
    name: "Agility",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  // Strength & Conditioning
  {
    sport: "Strength & Conditioning",
    slug: "vertical_jump",
    name: "Vertical Jump",
    category: "power",
    unit: "in",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Strength & Conditioning",
    slug: "broad_jump",
    name: "Broad Jump",
    category: "power",
    unit: "in",
    direction: "HIGHER_IS_BETTER",
  },
  {
    sport: "Strength & Conditioning",
    slug: "sprint_time",
    name: "Sprint Time",
    category: "speed",
    unit: "sec",
    direction: "LOWER_IS_BETTER",
  },
  {
    sport: "Strength & Conditioning",
    slug: "bench_press",
    name: "Bench Press",
    category: "strength",
    unit: "lbs",
    direction: "HIGHER_IS_BETTER",
  },
];

export function normalizeMetricLabel(label: string) {
  return label.trim().toLowerCase();
}

export function resolveMetricSlug(label: string, sport: string) {
  const normalized = normalizeMetricLabel(label);
  const mapped = LEGACY_METRIC_LABEL_MAP[normalized];
  if (mapped) return mapped;

  return normalized
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}
