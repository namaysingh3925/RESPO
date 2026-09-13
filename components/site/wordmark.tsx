import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

interface WordmarkProps {
  className?: string;
  onClick?: () => void;
}

/** Flame mark + "EMBER HOUSE", linking home. Inherits text colour from its parent. */
export function Wordmark({ className, onClick }: WordmarkProps) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label={`${siteConfig.name} — home`}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-lg text-base font-black uppercase tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:text-lg",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-lg bg-ember text-white shadow-sm"
      >
        <Flame className="size-5" strokeWidth={2.25} />
      </span>
      <span>{siteConfig.name}</span>
    </Link>
  );
}
