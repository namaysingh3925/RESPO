import type { ClipShape, StackItem } from "@/components/ui/connoisseur-stack-interactor";
import { PHOTOS, unsplash } from "@/lib/data/menu";
import { formatPrice } from "@/lib/format";
import type { MenuItemDTO } from "@/lib/types";

/** Clip shape that best matches each category's food. */
export const CATEGORY_CLIPS: Record<string, ClipShape> = {
  "burgers-grill": "clip-original",
  "wood-fired": "clip-slices",
  "bowls-greens": "clip-plates",
  brunch: "clip-pixels",
  desserts: "clip-hexagons",
  drinks: "clip-stripes",
};

const CLIP_ROTATION: ClipShape[] = [
  "clip-original",
  "clip-slices",
  "clip-plates",
  "clip-hexagons",
  "clip-arches",
  "clip-pixels",
  "clip-stripes",
];

/** Homepage "what we're cooking" showcase — one entry per menu category. */
export const HOME_SHOWCASE: Array<StackItem & { href: string }> = [
  { num: "01", name: "Smash Burgers", clipId: "clip-original", image: unsplash(PHOTOS.smashBurger), caption: "Burgers & grill · from ₹340", href: "/menu#burgers-grill" },
  { num: "02", name: "Wood-Fired Pizza", clipId: "clip-slices", image: unsplash(PHOTOS.rusticPizza), caption: "900°F oven · from ₹610", href: "/menu#wood-fired" },
  { num: "03", name: "Harvest Bowls", clipId: "clip-plates", image: unsplash(PHOTOS.harvestBowl), caption: "Bowls & greens · from ₹570", href: "/menu#bowls-greens" },
  { num: "04", name: "Artisan Waffles", clipId: "clip-pixels", image: unsplash(PHOTOS.waffles), caption: "Weekend brunch · Sat & Sun", href: "/menu#brunch" },
  { num: "05", name: "Fresh Desserts", clipId: "clip-hexagons", image: unsplash(PHOTOS.donuts), caption: "Baked in-house · from ₹270", href: "/menu#desserts" },
  { num: "06", name: "Steak Frites", clipId: "clip-arches", image: unsplash(PHOTOS.steakFrites), caption: "10oz hanger · ₹1,220", href: "/menu#burgers-grill" },
  { num: "07", name: "Smoked Cocktails", clipId: "clip-stripes", image: unsplash(PHOTOS.oldFashioned), caption: "Bar open till late", href: "/menu#drinks" },
];

/** Turn a category's dishes into interactor items, cycling clip shapes so every dish reveals differently. */
export function toStackItems(items: MenuItemDTO[], categorySlug?: string): StackItem[] {
  const start = Math.max(0, CLIP_ROTATION.indexOf(CATEGORY_CLIPS[categorySlug ?? ""] ?? "clip-original"));
  return items.map((item, i) => ({
    num: String(i + 1).padStart(2, "0"),
    name: item.name,
    clipId: CLIP_ROTATION[(start + i) % CLIP_ROTATION.length],
    image: item.imageUrl,
    caption: `${formatPrice(item.priceCents)} · ${item.description.split(/[,.]/)[0]}`,
  }));
}
