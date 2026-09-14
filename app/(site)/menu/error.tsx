"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Phone, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

interface MenuErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/** Shown when the menu can't be loaded (e.g. the database is unreachable). */
export default function MenuError({ error, retry }: MenuErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" aria-labelledby="menu-error-title" className="pt-16">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14 lg:px-8 lg:pt-20">
        <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-foreground uppercase">
          <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-ember" />
          The Menu
        </p>
        <h1
          id="menu-error-title"
          className="mt-4 max-w-3xl text-5xl leading-[0.85] font-black tracking-tighter text-charcoal uppercase sm:text-7xl"
        >
          The kitchen hit a snag
        </h1>
        <p className="mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
          We couldn&apos;t load the menu just now. Try again in a moment, or call us and we&apos;ll walk you
          through tonight&apos;s dishes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={() => retry()} className="h-12 rounded-full px-6 text-base">
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-full px-6 text-base">
            <a href={siteConfig.phoneHref}>
              <Phone aria-hidden="true" />
              Call {siteConfig.phone}
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
