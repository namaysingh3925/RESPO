import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Typography shared by the home page's story-scroll sections (mirrors components/demos/story-scroll-demo.tsx).
 * Server components; no client JS.
 */

/** Section inner padding: clears the fixed 64px header, then the story-scroll's own rhythm. */
export const HEADER_CLEARANCE = "calc(4rem + clamp(1.5rem, 4vw, 3.5rem))";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-bold tracking-[0.2em] uppercase", className)}>{children}</p>;
}

/** Hairline divider in the section text colour; override with e.g. "border-black/20". */
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("w-full border-t border-current/35", className)} />;
}

export const DISPLAY = "text-[clamp(3.5rem,12vw,14rem)] leading-[0.85] font-black tracking-tight uppercase";

export const LEAD = "max-w-[50ch] text-[clamp(1.125rem,2.5vw,2rem)] leading-relaxed";

export interface Pillar {
  title: string;
  body: string;
}

/** Row of short titled facts that wraps to a column on phones. */
export function Pillars({
  items,
  className,
  titleClassName,
  bodyClassName,
  "aria-label": ariaLabel,
}: {
  items: Pillar[];
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  "aria-label"?: string;
}) {
  return (
    <ul aria-label={ariaLabel} className={cn("flex flex-wrap gap-x-[3vw] gap-y-6", className)}>
      {items.map((item) => (
        <li key={item.title} className="min-w-[180px] flex-1">
          <p className={cn("mb-2 text-sm font-bold tracking-wider uppercase", titleClassName)}>{item.title}</p>
          <p className={cn("text-[clamp(0.95rem,1.3vw,1.1rem)] leading-relaxed", bodyClassName)}>{item.body}</p>
        </li>
      ))}
    </ul>
  );
}
