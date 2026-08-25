import { z } from "zod";

import { AGE_BANDS, type AgeBandId } from "@/lib/drills";
import { SPORTS } from "@/lib/athletes";

export const COURSE_ITEM_TYPES = ["DRILL", "TIP", "VIDEO"] as const;
export type CourseItemType = (typeof COURSE_ITEM_TYPES)[number];

export const courseAgeBandOptions = [
  { value: "", label: "All ages" },
  ...AGE_BANDS.map((band) => ({ value: band.id, label: band.label })),
] as const;

export const courseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  sport: z.string().min(1, "Sport is required"),
  description: z.string().optional(),
  ageBand: z.string().optional(),
  published: z.coerce.boolean().optional(),
});

export const courseItemSchema = z.object({
  type: z.enum(COURSE_ITEM_TYPES).default("DRILL"),
  title: z.string().min(1, "Title is required"),
  body: z.string().optional(),
  focus: z.string().optional(),
  coachingCue: z.string().optional(),
  equipment: z.string().optional(),
  durationMin: z.coerce.number().int().positive().optional(),
  ageBand: z.string().optional(),
  videoUrl: z.string().optional(),
});

export function formatCourseItemType(type: string) {
  switch (type) {
    case "DRILL":
      return "Drill";
    case "TIP":
      return "Tip";
    case "VIDEO":
      return "Video";
    default:
      return type;
  }
}

export function formatAgeBandLabel(ageBand: string | null | undefined) {
  if (!ageBand) return "All ages";
  const match = AGE_BANDS.find((b) => b.id === (ageBand as AgeBandId));
  return match?.label ?? ageBand;
}

export const COURSE_SPORTS = SPORTS;
