/**
 * Central brand configuration — update this file when the product name is finalized.
 * All UI copy, metadata, and logos pull from here.
 */
export const brand = {
  /** Full product name shown in titles and headers */
  name: "Youth Athlete Training",
  /** Short name for compact spaces (sidebar, mobile) */
  shortName: "Youth Training",
  /** Two-letter monogram for logo badges */
  monogram: "YT",
  /** Portal label shown under the logo in the coach app */
  portalLabel: "Coach Portal",
  /** Marketing tagline on the home page */
  tagline: "Train smarter. Track progress. Build stronger seasons.",
  /** One-line description for meta tags and auth pages */
  description:
    "Training platform for youth athletes and coaches — manage rosters, plan workouts, and track progress.",
  /** Home page hero badge text */
  heroBadge: "Built for youth coaches",
  /** Support / contact placeholder */
  supportEmail: "support@example.com",
} as const;

export type Brand = typeof brand;
