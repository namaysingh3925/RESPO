import Link from "next/link";
import { Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function CallToOrder({ action }: { action: string }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 className="text-2xl font-black tracking-tight text-charcoal uppercase">Online booking is coming soon</h2>
      <p className="mt-3 max-w-md text-pretty text-muted-foreground">
        Please call us to {action}. We&apos;ll take care of you right away.
      </p>
      <Link
        href={siteConfig.phoneHref}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3 font-bold text-white"
      >
        <Phone aria-hidden="true" className="size-4" />
        {siteConfig.phone}
      </Link>
    </section>
  );
}
