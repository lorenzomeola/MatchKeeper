import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Solo páginas indexables; signup y login son noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/home", "/safety", "/terms", "/privacy"];
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "/home" ? "weekly" : "monthly",
    priority: path === "/home" ? 1 : 0.5,
  }));
}
