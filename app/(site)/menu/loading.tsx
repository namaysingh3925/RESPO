import { MenuHero } from "@/components/menu/menu-hero";
import { Skeleton } from "@/components/ui/skeleton";

const FILTER_WIDTHS = ["w-32", "w-24", "w-32", "w-28"];
const NAV_WIDTHS = ["w-36", "w-32", "w-36", "w-36", "w-28", "w-24"];
const CARD_COUNT = 4;

/** Instant fallback for /menu: the real (static) hero, then skeletons shaped like the filters, nav and a section. */
export default function MenuLoading() {
  return (
    <main id="main" aria-labelledby="menu-title" className="pt-16 pb-8 sm:pb-12">
      <MenuHero />
      <p role="status" className="sr-only">
        Loading the menu…
      </p>

      <div aria-hidden="true">
        <div className="mx-auto max-w-7xl px-4 pb-5 sm:px-6 sm:pb-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTER_WIDTHS.map((width, index) => (
              <Skeleton key={index} className={`h-11 rounded-full ${width}`} />
            ))}
          </div>
        </div>

        <div className="border-b border-border">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-hidden px-4 py-2 sm:px-6 lg:px-8">
            <Skeleton className="size-11 shrink-0 rounded-full sm:w-28" />
            <span className="mx-1 h-6 w-px shrink-0 bg-border" />
            {NAV_WIDTHS.map((width, index) => (
              <Skeleton key={index} className={`h-11 shrink-0 rounded-full ${width}`} />
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-4 h-10 w-64 max-w-full sm:h-12 sm:w-96 lg:h-14" />
          <Skeleton className="mt-4 h-5 w-full max-w-md" />

          <div className="mt-6 sm:mt-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 xl:gap-16">
            <div className="hidden p-2 lg:block">
              <Skeleton className="mx-auto aspect-square w-full max-w-[min(100%,19rem,36vh)] rounded-3xl" />
              <div className="mt-6 space-y-4">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-7 w-1/2" />
              </div>
            </div>

            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              {Array.from({ length: CARD_COUNT }, (_, index) => (
                <li key={index} className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4">
                  <Skeleton className="size-24 shrink-0 rounded-xl sm:size-28" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-full" />
                    <Skeleton className="mt-1.5 h-3 w-2/3" />
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-11 w-20 rounded-full" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
