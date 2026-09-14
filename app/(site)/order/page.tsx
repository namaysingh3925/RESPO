import type { Metadata } from "next";
import { CheckoutForm } from "@/components/order/checkout-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Checkout",
  description: `Order pickup or delivery from ${siteConfig.name} in ${siteConfig.address.city} and pay in person.`,
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  return (
    <main id="main" className="pt-16 pb-28 md:pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="pt-8 pb-6 sm:pt-12 sm:pb-8 lg:pt-14">
          <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-foreground uppercase">
            <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-ember" />
            Pickup · Delivery
          </p>
          <h1 className="mt-3 text-5xl leading-[0.85] font-black tracking-tighter text-charcoal uppercase sm:text-7xl">
            Checkout
          </h1>
          <p className="mt-4 max-w-xl text-base text-pretty text-muted-foreground">
            A few details and your order goes straight to the {siteConfig.name} kitchen. No account needed, and you
            pay in person.
          </p>
        </header>

        <CheckoutForm />
      </div>
    </main>
  );
}
