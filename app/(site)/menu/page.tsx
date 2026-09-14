import type { Metadata } from "next";
import { MenuExplorer } from "@/components/menu/menu-explorer";
import { MenuHero } from "@/components/menu/menu-hero";
import { MenuJsonLd } from "@/components/menu/menu-json-ld";
import { getMenu } from "@/lib/services/menu";
import { siteConfig } from "@/lib/site-config";

// Re-render the menu at most every 5 minutes (ISR). Must stay a literal so Next can analyse it.
export const revalidate = 300;

const description = `Smash burgers, wood-fired pizza, fresh pasta, bowls, weekend brunch and house-baked desserts in ${siteConfig.address.city}. Filter by diet and order pickup or delivery online.`;

export const metadata: Metadata = {
  title: "Menu",
  description,
  alternates: { canonical: "/menu" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    url: "/menu",
    title: `Menu · ${siteConfig.name}`,
    description,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
  },
};

export default async function MenuPage() {
  const categories = await getMenu();

  return (
    <main id="main" aria-labelledby="menu-title" className="pt-16 pb-8 sm:pb-12">
      <MenuJsonLd categories={categories} />
      <MenuHero />
      <MenuExplorer categories={categories} />
    </main>
  );
}
