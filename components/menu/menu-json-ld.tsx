import type { DietaryTag } from "@/lib/constants";
import { siteConfig } from "@/lib/site-config";
import type { MenuCategoryWithItems } from "@/lib/types";

/** Dietary tags that have an exact schema.org RestrictedDiet equivalent. */
const SCHEMA_DIETS: Partial<Record<DietaryTag, string>> = {
  vegetarian: "https://schema.org/VegetarianDiet",
  vegan: "https://schema.org/VeganDiet",
  "gluten-free": "https://schema.org/GlutenFreeDiet",
};

/** schema.org `Menu` structured data for /menu (server-rendered, no client JS). */
export function MenuJsonLd({ categories }: { categories: readonly MenuCategoryWithItems[] }) {
  const sections = categories.filter((category) => category.items.length > 0);
  if (sections.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `${siteConfig.name} menu`,
    url: new URL("/menu", siteConfig.url).href,
    inLanguage: siteConfig.locale,
    hasMenuSection: sections.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      description: category.description || undefined,
      hasMenuItem: category.items.map((item) => {
        const diets = item.dietaryTags.flatMap((tag) => SCHEMA_DIETS[tag] ?? []);
        return {
          "@type": "MenuItem",
          name: item.name,
          description: item.description,
          image: item.imageUrl,
          suitableForDiet: diets.length > 0 ? diets : undefined,
          nutrition:
            item.calories !== null
              ? { "@type": "NutritionInformation", calories: `${item.calories} calories` }
              : undefined,
          offers: {
            "@type": "Offer",
            price: (item.priceCents / 100).toFixed(2),
            priceCurrency: siteConfig.currency,
            availability: item.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        };
      }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Escape "<" so dish copy can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
