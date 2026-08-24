import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/athletes", "/settings", "/api/"],
    },
    sitemap: `${getAppUrl()}/sitemap.xml`,
  };
}
