import { absoluteUrl } from "@/components/seo/absolute-url";
import { WEEKLY_HOURS } from "@/components/site/hours";
import { osmLargerMapUrl } from "@/components/visit/map-links";
import { PHOTOS, unsplash } from "@/lib/data/menu";
import { siteConfig } from "@/lib/site-config";

/** Collapses days that share the same hours into one OpeningHoursSpecification each. */
function openingHoursSpecification() {
  const groups = new Map<string, { opens: string; closes: string; dayOfWeek: string[] }>();
  for (const day of WEEKLY_HOURS) {
    if (!day.open || !day.close) continue;
    const key = `${day.open}-${day.close}`;
    const group = groups.get(key) ?? { opens: day.open, closes: day.close, dayOfWeek: [] };
    group.dayOfWeek.push(`https://schema.org/${day.label}`);
    groups.set(key, group);
  }
  return Array.from(groups.values(), (group) => ({
    "@type": "OpeningHoursSpecification",
    ...group,
  }));
}

function restaurantSchema() {
  const { address, geo } = siteConfig;
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": absoluteUrl("/#restaurant"),
    name: siteConfig.name,
    slogan: siteConfig.tagline,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    telephone: siteConfig.phoneHref.replace(/^tel:/, ""),
    email: siteConfig.email,
    image: [siteConfig.ogImage, unsplash(PHOTOS.diningRoom), unsplash(PHOTOS.chefPlating)],
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.region,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: geo.lat,
      longitude: geo.lng,
    },
    hasMap: osmLargerMapUrl,
    servesCuisine: ["American", "Pizza", "Burgers", "Brunch"],
    priceRange: "$$",
    currenciesAccepted: siteConfig.currency,
    acceptsReservations: absoluteUrl("/reserve"),
    hasMenu: absoluteUrl("/menu"),
    openingHoursSpecification: openingHoursSpecification(),
  };
}

/** schema.org Restaurant structured data. Render once per page (home and /visit). */
export function RestaurantJsonLd() {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so a value can never close the script tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema()).replace(/</g, "\\u003c") }}
    />
  );
}
