/** First focusable element on every public page; jumps past the header to `<… id="main">`. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="fixed top-2.5 left-4 z-[60] -translate-y-20 rounded-full bg-ember px-5 py-3 text-sm font-bold text-white shadow-lg outline-none transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal motion-reduce:transition-none"
    >
      Skip to content
    </a>
  );
}
