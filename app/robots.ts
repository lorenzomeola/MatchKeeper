import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/admin", "/dashboard", "/matches", "/messages", "/payments", "/profile", "/calendar", "/map", "/keepers", "/home", "/onboarding"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
