import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/components/seo/absolute-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // "/order/" (with the slash) keeps private tracking pages out while /order stays crawlable.
      disallow: ["/admin", "/api", "/demos", "/order/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
