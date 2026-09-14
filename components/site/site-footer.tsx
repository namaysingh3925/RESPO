import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { groupWeeklyHours } from "@/components/site/hours";
import { Wordmark } from "@/components/site/wordmark";
import { directionsUrl, siteConfig } from "@/lib/site-config";

const FOOTER_LINKS = [{ label: "Home", href: "/" }, ...siteConfig.nav];

const HEADING = "text-xs font-bold tracking-[0.2em] text-white/55 uppercase";
const LINK =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md font-semibold text-white underline-offset-4 outline-none hover:text-ember hover:underline focus-visible:ring-2 focus-visible:ring-ember";

/** Charcoal site footer: visit details, grouped weekly hours, contact, links and an oversized wordmark. */
export function SiteFooter() {
  const { address } = siteConfig;
  const hours = groupWeeklyHours();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto overflow-hidden bg-charcoal text-white">
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 lg:px-8 lg:pt-24">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-3">
            <Wordmark className="text-white" />
            <p className="mt-4 max-w-sm text-base text-pretty text-white/70">
              {siteConfig.tagline} from a wood-fired kitchen in {address.city}. Order pickup or
              delivery, or pull up a chair.
            </p>
          </div>

          <section aria-labelledby="footer-visit" className="lg:col-span-3">
            <h2 id="footer-visit" className={HEADING}>
              Visit
            </h2>
            <address className="mt-4 text-base leading-relaxed text-white/85 not-italic">
              {address.street}
              <br />
              {address.city}, {address.region} {address.postalCode}
            </address>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
              Directions
              <ArrowUpRight className="size-4" aria-hidden="true" />
              <span className="sr-only"> (opens Google Maps in a new tab)</span>
            </a>
          </section>

          <section aria-labelledby="footer-hours" className="lg:col-span-3">
            <h2 id="footer-hours" className={HEADING}>
              Hours
            </h2>
            <dl className="mt-4 space-y-2 text-base">
              {hours.map((group) => (
                <div key={group.days} className="flex justify-between gap-4 sm:flex-col sm:gap-0 lg:flex-row lg:gap-4">
                  <dt className="font-semibold text-white">
                    <span aria-hidden="true">{group.days}</span>
                    <span className="sr-only">{group.daysLong}</span>
                  </dt>
                  <dd className="text-white/75 tabular-nums">{group.hours}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="footer-contact" className="lg:col-span-3">
            <h2 id="footer-contact" className={HEADING}>
              Contact
            </h2>
            <ul className="mt-3 flex flex-col text-base">
              <li>
                <a href={siteConfig.phoneHref} className={LINK}>
                  {siteConfig.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${siteConfig.email}`} className={`${LINK} break-all`}>
                  {siteConfig.email}
                </a>
              </li>
              <li className="flex min-h-11 items-center text-white/75">
                Instagram&nbsp;<span className="font-semibold text-white">{siteConfig.instagramHandle}</span>
              </li>
            </ul>
          </section>
        </div>

        <nav aria-label="Footer" className="mt-12 border-t border-white/10 pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p
          aria-hidden="true"
          className="mt-10 text-[24vw] leading-[0.8] font-black tracking-tighter whitespace-nowrap text-white uppercase select-none sm:text-[13vw] xl:text-[11rem]"
        >
          Ember
          <br className="sm:hidden" /> House
        </p>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.name}
          </p>
          <p>
            {address.street} · {address.city}, {address.region}
          </p>
        </div>
      </div>
    </footer>
  );
}
