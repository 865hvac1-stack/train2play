import { SPORTS } from "@/lib/athletes";
import { AGE_GROUPS } from "@/lib/community/age-groups";

const UNIVERSAL = ["Strength", "Speed", "Player Development", "Mental Performance"] as const;

const BY_SPORT: Record<string, readonly string[]> = {
  Baseball: [
    "Hitting",
    "Pitching",
    "Catching",
    "Fielding",
    "Infield",
    "Outfield",
    ...UNIVERSAL,
  ],
  Softball: [
    "Hitting",
    "Pitching",
    "Catching",
    "Fielding",
    "Infield",
    "Outfield",
    ...UNIVERSAL,
  ],
  Basketball: ["Shooting", "Ball Handling", "Defense", "Footwork", ...UNIVERSAL],
  Football: ["Quarterback", "Skill Positions", "Linemen", "Defense", ...UNIVERSAL],
  Soccer: ["Technical", "Goalkeeping", "Tactical", ...UNIVERSAL],
  Volleyball: ["Hitting", "Setting", "Passing", "Defense", ...UNIVERSAL],
  "Track & Field": ["Sprints", "Jumps", "Throws", "Distance", ...UNIVERSAL],
  Wrestling: ["Technique", "Takedowns", "Conditioning", ...UNIVERSAL],
  Other: [...UNIVERSAL],
};

export const COACHING_AGE_GROUPS = AGE_GROUPS.map((group) => group.id);

export function specialtiesForSport(sport: string) {
  const extra = BY_SPORT[sport] ?? UNIVERSAL;
  return [...new Set(extra)];
}

export function allCoachingSports() {
  return [...SPORTS];
}

export function isKnownAgeGroup(value: string) {
  return COACHING_AGE_GROUPS.includes(value as (typeof COACHING_AGE_GROUPS)[number]);
}
