"use client";

import { cn } from "@/lib/utils";
import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/** Clip-path masks the image is revealed through. Each one is a set of `.path` shapes. */
export type ClipShape =
  | "clip-original" // stacked burger silhouette
  | "clip-hexagons" // bento boxes
  | "clip-pixels" // 3×3 grid
  | "clip-slices" // pizza wedges
  | "clip-plates" // centre plate + garnish
  | "clip-arches" // three arched windows
  | "clip-stripes"; // pill bars

export interface StackItem {
  num: string;
  name: string;
  clipId: ClipShape;
  image: string;
  /** Optional line revealed under the active item, e.g. a price or short description. */
  caption?: string;
}

const defaultItems: StackItem[] = [
  {
    num: "01",
    name: "Gourmet Burgers",
    clipId: "clip-original",
    image: "https://cdn.21st.dev/assets/mirror/53/534bb84332e13a8595670521bdcc71acd40fabbf589c1775f4028df1ca1ea96a.jpg"
  },
  {
    num: "02",
    name: "Fresh Desserts",
    clipId: "clip-hexagons",
    image: "https://cdn.21st.dev/assets/mirror/be/bec9c493cadbcd53fd0e00a0cf98f1dbb7813141c9c461b8c1b7920f6b7fa721.jpg"
  },
  {
    num: "03",
    name: "Artisan Waffles",
    clipId: "clip-pixels",
    image: "https://cdn.21st.dev/assets/mirror/b0/b05848f9ad0d993c69b9c21c3793b3b5507eff7064b01540d196cac068101729.jpg"
  }
];

const SLICE_PATHS = [
  "M253.1,242.6 L253.1,16.6 A226,226 0 0 1 412.9,82.8 Z",
  "M257.4,246.9 L417.2,87.1 A226,226 0 0 1 483.4,246.9 Z",
  "M257.4,253.1 L483.4,253.1 A226,226 0 0 1 417.2,412.9 Z",
  "M253.1,257.4 L412.9,417.2 A226,226 0 0 1 253.1,483.4 Z",
  "M246.9,257.4 L246.9,483.4 A226,226 0 0 1 87.1,417.2 Z",
  "M242.6,253.1 L82.8,412.9 A226,226 0 0 1 16.6,253.1 Z",
  "M242.6,246.9 L16.6,246.9 A226,226 0 0 1 82.8,87.1 Z",
  "M246.9,242.6 L87.1,82.8 A226,226 0 0 1 246.9,16.6 Z",
];

const GARNISH_CENTERS: Array<[number, number]> = [
  [250, 54], [388.6, 111.4], [446, 250], [388.6, 388.6],
  [250, 446], [111.4, 388.6], [54, 250], [111.4, 111.4],
];

const STRIPE_HEIGHTS = [260, 360, 440, 400, 440, 360, 260];

export interface ConnoisseurStackInteractorProps {
  items?: StackItem[];
  className?: string;
  /** Advance to the next item after each reveal until the visitor interacts. */
  autoPlay?: boolean;
  /** "compact" tightens type and spacing for longer lists. */
  density?: "comfortable" | "compact";
  onActiveChange?: (index: number) => void;
  "aria-label"?: string;
}

export const Component = ({
  items = defaultItems,
  className,
  autoPlay = false,
  density = "comfortable",
  onActiveChange,
  "aria-label": ariaLabel = "Featured dishes",
}: ConnoisseurStackInteractorProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const masterTl = useRef<gsap.core.Timeline | null>(null);
  const interacted = useRef(false);
  const visible = useRef(true);
  const onActiveChangeRef = useRef(onActiveChange);

  // clipPath ids must be unique per instance so several interactors can share a page.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipDomId = (clipId: ClipShape) => `${uid}-${clipId}`;

  const safeIndex = items.length > 0 ? Math.min(activeIndex, items.length - 1) : 0;
  const active = items[safeIndex];
  const compact = density === "compact";

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  });

  useEffect(() => {
    onActiveChangeRef.current?.(safeIndex);
  }, [safeIndex]);

  // Warm the cache so switching items never shows an empty mask.
  useEffect(() => {
    items.forEach((item) => {
      const img = new window.Image();
      img.src = item.image;
    });
  }, [items]);

  // Pause the infinite loop while the interactor is off-screen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        masterTl.current?.paused(!entry.isIntersecting);
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const svg = svgRef.current;
      if (!svg || !active) return;

      const paths = svg.querySelectorAll<SVGGraphicsElement>(`[data-clip="${active.clipId}"] .path`);
      if (paths.length === 0) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(paths, { scale: 1 });
        return;
      }

      gsap.set(paths, { scale: 0, transformOrigin: "50% 50%" });

      const advance = autoPlay && items.length > 1 && !interacted.current;

      const tl = gsap.timeline({
        repeat: advance ? 0 : -1,
        repeatDelay: 1,
        paused: !visible.current,
        onComplete: advance
          ? () => {
              if (!interacted.current) setActiveIndex((i) => (i + 1) % items.length);
            }
          : undefined,
      });

      // 1. IN (Expo Out)
      tl.to(paths, {
        scale: 1,
        duration: 0.8,
        stagger: { amount: 0.4, from: "random" },
        ease: "expo.out",
      })
        // 2. IDLE (Sine Breath)
        .to(paths, {
          scale: 1.05,
          duration: 1.5,
          yoyo: true,
          repeat: 1,
          ease: "sine.inOut",
          stagger: { amount: 0.2, from: "center" },
        })
        // 3. OUT (Expo In)
        .to(paths, {
          scale: 0,
          duration: 0.6,
          stagger: { amount: 0.3, from: "edges" },
          ease: "expo.in",
        });

      if (advance) tl.to({}, { duration: 0.35 });

      masterTl.current = tl;
      return () => {
        masterTl.current = null;
      };
    },
    {
      scope: containerRef,
      dependencies: [safeIndex, active?.clipId, active?.image, autoPlay, items.length],
      revertOnUpdate: true,
    },
  );

  const handleSelect = (index: number) => {
    interacted.current = true;
    if (index === safeIndex) {
      // An auto-advancing reveal becomes a regular loop once the visitor takes over.
      if (masterTl.current && masterTl.current.repeat() === 0) masterTl.current.repeat(-1);
      return;
    }
    setActiveIndex(index);
  };

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col md:flex-row items-center justify-between min-h-screen w-full p-8 md:p-24 overflow-hidden transition-colors duration-500",
        "bg-white dark:bg-[#050505]",
        className
      )}
    >

      {/* LEFT SIDE: HIGH CONTRAST MENU */}
      <div className="z-20 w-full md:w-1/2">
        <nav aria-label={ariaLabel}>
          <ul className={cn("flex flex-col", compact ? "gap-7 md:gap-10" : "gap-14")}>
            {items.map((item, index) => {
              const isActive = index === safeIndex;
              const [firstWord, ...restWords] = item.name.split(" ");
              return (
                <li key={`${item.num}-${item.name}`}>
                  <button
                    type="button"
                    onMouseEnter={() => handleSelect(index)}
                    onFocus={() => handleSelect(index)}
                    onClick={() => handleSelect(index)}
                    aria-pressed={isActive}
                    className="group w-full cursor-pointer rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4"
                  >
                    <span className={cn("flex items-start", compact ? "gap-4 md:gap-6" : "gap-6")}>
                      {/* Numbers: Increased visibility for non-hover state */}
                      <span className={cn(
                        "font-bold transition-all duration-500",
                        compact ? "text-xl md:text-3xl mt-1 md:mt-2" : "text-3xl mt-2",
                        isActive
                          ? "text-orange-500 scale-110"
                          : "text-zinc-400 dark:text-zinc-600"
                      )}>
                        {item.num}
                      </span>

                      <span className="block min-w-0">
                        {/* Main Text: Enhanced visibility logic */}
                        <span className={cn(
                          "block font-black uppercase tracking-tighter leading-[0.85] transition-all duration-700",
                          compact ? "text-4xl sm:text-5xl lg:text-6xl" : "text-5xl md:text-6xl",
                          isActive
                            ? "text-zinc-950 dark:text-white opacity-100 translate-x-4"
                            // INACTIVE STATE: Increased from Zinc-200 to Zinc-400 for Light Mode
                            // Increased stroke visibility for Dark Mode (#52525b is Zinc-600)
                            : "opacity-40 translate-x-0 " +
                              "text-zinc-500 dark:text-transparent " +
                              "dark:[text-stroke:1.5px_#52525b] dark:[-webkit-text-stroke:1.5px_#52525b]"
                        )}>
                          {firstWord}
                          {restWords.length > 0 && (
                            <>
                              <br />
                              {restWords.join(" ")}
                            </>
                          )}
                        </span>

                        {item.caption && (
                          <span
                            className={cn(
                              "block overflow-hidden text-sm font-medium text-zinc-600 transition-all duration-500 dark:text-zinc-400 md:text-base",
                              isActive ? "mt-3 max-h-16 translate-x-4 opacity-100" : "max-h-0 opacity-0"
                            )}
                          >
                            {item.caption}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* RIGHT SIDE: MASKED IMAGE (first on mobile so taps are visible) */}
      <div className="relative order-first mb-12 flex w-full items-center justify-center md:order-none md:mb-0 md:w-1/2">
        <div aria-hidden="true" className="absolute w-[120%] h-[120%] bg-orange-500/10 dark:bg-orange-600/5 blur-[120px] rounded-full transition-opacity duration-1000" />

        <svg
          ref={svgRef}
          viewBox="0 0 500 500"
          role="img"
          aria-label={active.name}
          className="w-[100%] max-w-[360px] md:max-w-[500px] h-auto z-10 drop-shadow-xl dark:drop-shadow-[0_0_60px_rgba(0,0,0,0.8)]"
        >
          <defs>
            <clipPath id={clipDomId("clip-original")} data-clip="clip-original">
              <path className="path" d="M480.6,235H19.4c-6,0-10.8-4.9-10.8-10.8v-9.5c0-6,4.9-10.8,10.8-10.8h461.1c6,0,10.8,4.9,10.8,10.8v9.5C491.4,230.2,486.6,235,480.6,235z" />
              <path className="path" d="M483.1,362.4H16.9c-4.6,0-8.3-3.7-8.3-8.3v-1.8c0-4.6,3.7-8.3,8.3-8.3h466.1c4.6,0,8.3,3.7,8.3,8.3v1.8C491.4,358.7,487.7,362.4,483.1,362.4z" />
              <path className="path" d="M460.3,336.3H39.7c-17.2,0-31.1-13.9-31.1-31.1v-31.5c0-17.2,13.9-31.1,31.1-31.1h420.7c17.2,0,31.1,13.9,31.1,31.1v31.5C491.4,322.4,477.5,336.3,460.3,336.3z" />
              <path className="path" d="M459.2,196.2H40.8v-35c0-47.5,38.5-86,86-86h246.5c47.5,0,86,38.5,86,86V196.2z" />
              <path className="path" d="M441.9,424.9H58.1c-9.6,0-17.3-7.8-17.3-17.3v-37.4h418.5v37.4C459.2,417.1,451.5,424.9,441.9,424.9z" />
            </clipPath>

            <clipPath id={clipDomId("clip-hexagons")} data-clip="clip-hexagons">
              <rect className="path" x="20" y="20" width="200" height="280" rx="12" />
              <rect className="path" x="20" y="320" width="200" height="160" rx="12" />
              <rect className="path" x="240" y="20" width="240" height="140" rx="12" />
              <rect className="path" x="240" y="180" width="110" height="160" rx="12" />
              <rect className="path" x="370" y="180" width="110" height="160" rx="12" />
              <rect className="path" x="240" y="360" width="240" height="120" rx="12" />
            </clipPath>

            {/* Grid Squares with rx="4" as requested */}
            <clipPath id={clipDomId("clip-pixels")} data-clip="clip-pixels">
              {Array.from({ length: 9 }).map((_, i) => (
                <rect
                  key={i}
                  className="path"
                  x={(i % 3) * 160 + 20}
                  y={Math.floor(i / 3) * 160 + 20}
                  width="140"
                  height="140"
                  rx="4"
                />
              ))}
            </clipPath>

            {/* Pizza wedges, slightly exploded */}
            <clipPath id={clipDomId("clip-slices")} data-clip="clip-slices">
              {SLICE_PATHS.map((d) => (
                <path key={d} className="path" d={d} />
              ))}
            </clipPath>

            {/* Centre plate with a ring of garnish */}
            <clipPath id={clipDomId("clip-plates")} data-clip="clip-plates">
              <circle className="path" cx="250" cy="250" r="130" />
              {GARNISH_CENTERS.map(([x, y]) => (
                <circle key={`${x}-${y}`} className="path" cx={x} cy={y} r="48" />
              ))}
            </clipPath>

            {/* Three arched windows, the middle one tallest */}
            <clipPath id={clipDomId("clip-arches")} data-clip="clip-arches">
              <path className="path" d="M19,480 V193 A73,73 0 0 1 165,193 V480 Z" />
              <path className="path" d="M177,480 V93 A73,73 0 0 1 323,93 V480 Z" />
              <path className="path" d="M335,480 V193 A73,73 0 0 1 481,193 V480 Z" />
            </clipPath>

            {/* Pill bars, tallest in the middle */}
            <clipPath id={clipDomId("clip-stripes")} data-clip="clip-stripes">
              {STRIPE_HEIGHTS.map((h, i) => (
                <rect
                  key={i}
                  className="path"
                  x={18 + i * 68}
                  y={250 - h / 2}
                  width="56"
                  height={h}
                  rx="28"
                />
              ))}
            </clipPath>
          </defs>

          <g clipPath={`url(#${clipDomId(active.clipId)})`}>
            <image
              href={active.image}
              width="500"
              height="500"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};

export { Component as ConnoisseurStackInteractor };
