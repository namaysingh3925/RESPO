import { CartSheet } from "@/components/cart/cart-sheet";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SkipLink } from "@/components/site/skip-link";

/**
 * Public site chrome. Pages render their own `<main id="main">` (the home page's FlowArt renders <main> itself),
 * so children are deliberately not wrapped here.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      {children}
      <SiteFooter />
      <MobileActionBar />
      <CartSheet />
    </>
  );
}
