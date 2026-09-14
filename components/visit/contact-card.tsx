import { AtSign, Mail, Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { directionsUrl, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const ROW = "flex min-h-11 items-center justify-between gap-4 py-1";
const LINK =
  "rounded-md font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

/** Street address with Directions + Call, and the rest of the contact details. */
export function ContactCard({ className }: { className?: string }) {
  const { address } = siteConfig;

  return (
    <section
      aria-labelledby="visit-address"
      className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}
    >
      <h2 id="visit-address" className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
        Address
      </h2>
      <address className="mt-3 text-2xl leading-tight font-black tracking-tight text-charcoal uppercase not-italic sm:text-3xl">
        {address.street}
        <br />
        {address.city}, {address.region} {address.postalCode}
      </address>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button asChild className="h-12 rounded-full px-5 text-base font-semibold">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation aria-hidden="true" />
            Directions
            <span className="sr-only"> (opens Google Maps in a new tab)</span>
          </a>
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-full px-5 text-base font-semibold">
          <a href={siteConfig.phoneHref}>
            <Phone aria-hidden="true" />
            Call
            <span className="sr-only"> {siteConfig.phone}</span>
          </a>
        </Button>
      </div>

      <dl className="mt-5 divide-y divide-border border-t border-border text-sm">
        <div className={ROW}>
          <dt className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-4 text-ember" aria-hidden="true" />
            Phone
          </dt>
          <dd>
            <a href={siteConfig.phoneHref} className={LINK}>
              {siteConfig.phone}
            </a>
          </dd>
        </div>
        <div className={ROW}>
          <dt className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-4 text-ember" aria-hidden="true" />
            Email
          </dt>
          <dd className="min-w-0">
            <a href={`mailto:${siteConfig.email}`} className={cn(LINK, "break-all")}>
              {siteConfig.email}
            </a>
          </dd>
        </div>
        <div className={ROW}>
          <dt className="flex items-center gap-2 text-muted-foreground">
            <AtSign className="size-4 text-ember" aria-hidden="true" />
            Instagram
          </dt>
          <dd className="font-semibold">{siteConfig.instagramHandle}</dd>
        </div>
      </dl>
    </section>
  );
}
