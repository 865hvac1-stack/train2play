/**
 * Central brand configuration — update this file to rebrand the app.
 * All UI copy, metadata, and logos pull from here.
 */
export const brand = {
  /** Full product name shown in titles and headers */
  name: "Train2Play",
  /** Marketing domain */
  domain: "train2play.com",
  /** Short name for compact spaces (sidebar, mobile) */
  shortName: "Train2Play",
  /** Two-letter monogram for logo badges */
  monogram: "T2P",
  /** Portal label shown under the logo in the coach app */
  portalLabel: "Coach Portal",
  /** Marketing tagline on the home page */
  tagline: "Train Better. Play Better.",
  /** Secondary tagline for descriptions */
  subtagline: "Training. Progress. Performance. One athlete profile.",
  /** One-line description for meta tags and auth pages */
  description:
    "Train2Play helps coaches manage rosters, film, velo, and pickup players — from training to game day.",
  /** Home page hero badge text */
  heroBadge: "train2play.com",
  /** Support / contact */
  supportEmail: "support@train2play.com",
  /** Brand colors from logo */
  colors: {
    orange: "#FF6600",
    orangeHover: "#e55a00",
    orangeLight: "#fff4eb",
    orangeMuted: "#ffe8d6",
    black: "#000000",
    white: "#FFFFFF",
  },
  /** Paths to logo assets in /public */
  logo: {
    full: "/brand/logo.png",
    mark: "/brand/logo-mark.png",
  },
} as const;

export type Brand = typeof brand;
