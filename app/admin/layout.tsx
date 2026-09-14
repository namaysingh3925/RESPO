import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Flame } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

/** Staff area chrome: a compact bar instead of the public header, footer and action bar. */
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-full focus:bg-ember focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 bg-charcoal text-cream shadow-sm">
        <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <p className="flex min-w-0 items-center gap-2.5 text-sm font-black uppercase tracking-tight sm:text-base">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-ember text-white">
              <Flame className="size-5" strokeWidth={2.25} />
            </span>
            <span className="truncate">
              {siteConfig.name}
              <span className="font-semibold text-cream/70 normal-case"> · Staff</span>
            </span>
          </p>
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 ring-cream/25 transition-colors ring-inset hover:bg-cream/10 focus-visible:ring-2 focus-visible:ring-ember focus-visible:outline-none"
          >
            View site
            <ArrowUpRight className="size-4" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-screen-2xl flex-1 px-4 pt-5 pb-10 outline-none sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
