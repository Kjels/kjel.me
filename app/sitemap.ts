import type { MetadataRoute } from "next";
import { PROJECTS } from "@/content/work";
import { posts } from "@/content/writing";

const BASE = "https://kjel.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, priority: 1 },
    { url: `${BASE}/work`, lastModified: now, priority: 0.9 },
    ...PROJECTS.map((p) => ({ url: `${BASE}/work/${p.slug}`, lastModified: now, priority: 0.7 })),
    ...(posts().length ? [{ url: `${BASE}/writing`, lastModified: now, priority: 0.9 }] : []),
    ...posts().map((p) => ({ url: `${BASE}/writing/${p.slug}`, lastModified: new Date(p.date), priority: 0.8 })),
    { url: `${BASE}/about`, lastModified: now, priority: 0.6 },
  ];
}
