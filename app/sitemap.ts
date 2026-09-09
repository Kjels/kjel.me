import type { MetadataRoute } from "next";
import { PROJECTS } from "@/content/work";

const BASE = "https://kjel.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, priority: 1 },
    { url: `${BASE}/work`, lastModified: now, priority: 0.9 },
    ...PROJECTS.map((p) => ({ url: `${BASE}/work/${p.slug}`, lastModified: now, priority: 0.7 })),
    { url: `${BASE}/about`, lastModified: now, priority: 0.6 },
  ];
}
