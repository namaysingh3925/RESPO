import { ExternalLink, MapPin } from "lucide-react";
import { osmEmbedUrl, osmLargerMapUrl } from "@/components/visit/map-links";
import { fullAddress, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/** Lazy OpenStreetMap iframe with a marker on the restaurant and a "View larger map" link. */
export function MapEmbed({ className }: { className?: string }) {
  return (
    <figure className={cn("flex flex-col overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <div className="relative aspect-[4/3] w-full bg-muted sm:aspect-video lg:aspect-auto lg:min-h-[26rem] lg:flex-1">
        <iframe
          src={osmEmbedUrl}
          title={`Map showing ${siteConfig.name} at ${fullAddress}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0"
        />
      </div>
      <figcaption className="flex flex-col gap-1 border-t border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        <span className="flex items-start gap-2 pt-2 text-sm text-muted-foreground sm:pt-0">
          <MapPin className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden="true" />
          {fullAddress}
        </span>
        <a
          href={osmLargerMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-md text-sm font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
        >
          View larger map
          <ExternalLink className="size-4 text-ember" aria-hidden="true" />
          <span className="sr-only"> (opens OpenStreetMap in a new tab)</span>
        </a>
      </figcaption>
    </figure>
  );
}
