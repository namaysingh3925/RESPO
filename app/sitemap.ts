import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/components/seo/absolute-url";

const ROUTES: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/menu", changeFrequency: "daily", priority: 0.9 },
  { path: "/reserve", changeFrequency: "weekly", priority: 0.8 },
  { path: "/order", changeFrequency: "weekly", priority: 0.7 },
  { path: "/visit", changeFrequency: "monthly", priority: 0.7 },
];

/** Public, indexable pages only. Order tracking, admin, API and demos are excluded (see robots.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  }));
}
