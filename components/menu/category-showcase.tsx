"use client";

import { useMemo } from "react";
import { Component as StackInteractor } from "@/components/ui/connoisseur-stack-interactor";
import { useMediaQuery } from "@/components/menu/use-media-query";
import { toStackItems } from "@/lib/showcase";
import type { MenuItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Re-flows the full-screen interactor into a narrow sticky column:
 * no min-height/padding/background, image stacked above the dish list (column-reverse),
 * both halves full width, and type/image sizes capped so the whole column fits in the viewport.
 */
const COLUMN_LAYOUT = cn(
  "min-h-0 gap-6 bg-transparent p-2 md:flex-col-reverse md:p-2 dark:bg-transparent",
  "[&>div]:mb-0 [&>div]:w-full",
  "[&_svg]:max-w-[min(100%,19rem,36vh)]",
  "[&_ul]:gap-4",
  "[&_.uppercase]:text-2xl",
  "[&_button>span>span:first-child]:mt-0 [&_button>span>span:first-child]:text-base",
);

interface CategoryShowcaseProps {
  categoryName: string;
  categorySlug: string;
  items: MenuItemDTO[];
}

/**
 * Desktop-only clip-path dish showcase. It mounts only at lg+ so phones never download
 * the full-size photos the interactor preloads.
 */
export function CategoryShowcase({ categoryName, categorySlug, items }: CategoryShowcaseProps) {
  const isDesktop = useMediaQuery("(min-width: 64rem)");
  const stackItems = useMemo(() => toStackItems(items, categorySlug), [items, categorySlug]);

  if (!isDesktop || stackItems.length === 0) return null;

  return (
    <StackInteractor
      items={stackItems}
      density="compact"
      aria-label={`${categoryName} dish previews`}
      className={COLUMN_LAYOUT}
    />
  );
}
