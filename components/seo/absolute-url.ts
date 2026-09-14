import { siteConfig } from "@/lib/site-config";

/** "/menu" → "https://emberhouse.example/menu", resolved against `siteConfig.url` (NEXT_PUBLIC_SITE_URL). */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}
