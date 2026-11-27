import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Solo páginas indexables; signup y login son noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/home", "/hire-a-goalkeeper-london", "/goalkeeper-matches-london", "/safety", "/terms", "/privacy"];
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "/home" ? "weekly" : "monthly",
    priority: path === "/home" ? 1 : path.endsWith("-london") ? 0.8 : 0.5,
  }));
}
