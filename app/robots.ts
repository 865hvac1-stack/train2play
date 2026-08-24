import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/athletes",
        "/pickup-players",
        "/training",
        "/calendar",
        "/reports",
        "/videos",
        "/settings",
        "/onboarding",
        "/view/",
        "/api/",
      ],
    },
    sitemap: `${getAppUrl()}/sitemap.xml`,
  };
}
