"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Component as StackInteractor } from "@/components/ui/connoisseur-stack-interactor";
import { HOME_SHOWCASE } from "@/lib/showcase";

/**
 * Home "What we're cooking": the clip-path dish interactor, re-flowed to sit inside a story-scroll section
 * (no full-screen height, padding or background), plus a link that follows the active dish.
 */
export function SignatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = HOME_SHOWCASE[activeIndex] ?? HOME_SHOWCASE[0];

  return (
    <div className="flex flex-col gap-8 md:gap-12">
      <StackInteractor
        items={HOME_SHOWCASE}
        autoPlay
        density="compact"
        onActiveChange={setActiveIndex}
        aria-label="Signature dishes"
        className="min-h-0 bg-transparent p-0 md:gap-12 md:p-0 dark:bg-transparent"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link
          href={active.href}
          className="group inline-flex min-h-12 items-center gap-2 self-start rounded-full text-lg font-bold text-charcoal underline decoration-ember decoration-2 underline-offset-8 outline-none hover:decoration-4 focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
        >
          Explore {active.name}
          <ArrowRight
            className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
        <Button
          asChild
          className="h-12 self-start rounded-full bg-charcoal px-6 text-base font-semibold text-white hover:bg-charcoal/85"
        >
          <Link href="/menu">See the full menu</Link>
        </Button>
      </div>
    </div>
  );
}
