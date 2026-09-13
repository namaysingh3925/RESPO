import type { ReactNode } from "react";
import type { FulfillmentType } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import type { OrderTotals } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface OrderSummaryLine {
  id: string;
  name: string;
  quantity: number;
  lineTotalCents: number;
  notes?: string | null;
}

interface OrderSummaryProps {
  lines: OrderSummaryLine[];
  totals: OrderTotals;
  fulfillment: FulfillmentType;
  /** Checkout shows client-side estimates; tracking shows the totals the server charged. */
  estimated?: boolean;
  /** Tip rate shown next to the tip label, e.g. 0.15 → "Tip (15%)". */
  tipRate?: number;
  /** Hide the heading when an outer element (e.g. a disclosure) already labels the summary. */
  hideHeading?: boolean;
  headingId?: string;
  footer?: ReactNode;
  className?: string;
}

const taxPercent = `${+(siteConfig.ordering.taxRate * 100).toFixed(3)}%`;

/** Line items + subtotal, tax, delivery, tip and total. Presentational; safe in server and client trees. */
export function OrderSummary({
  lines,
  totals,
  fulfillment,
  estimated = false,
  tipRate,
  hideHeading = false,
  headingId,
  footer,
  className,
}: OrderSummaryProps) {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const rows: Array<{ label: string; value: string; emphasis?: boolean }> = [
    { label: "Subtotal", value: formatPrice(totals.subtotalCents) },
    { label: `Tax (${taxPercent})`, value: formatPrice(totals.taxCents) },
  ];
  if (fulfillment === "DELIVERY") {
    rows.push({
      label: "Delivery fee",
      value: totals.deliveryFeeCents > 0 ? formatPrice(totals.deliveryFeeCents) : "Free",
      emphasis: totals.deliveryFeeCents === 0,
    });
  }
  rows.push({
    label: tipRate !== undefined && tipRate > 0 ? `Tip (${Math.round(tipRate * 100)}%)` : "Tip",
    value: formatPrice(totals.tipCents),
  });

  return (
    <section
      aria-labelledby={hideHeading ? undefined : headingId}
      className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}
    >
      {!hideHeading && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id={headingId} className="text-lg font-bold">
            Order summary
          </h2>
          <span className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      )}

      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                <span className="mr-1.5 inline-block min-w-6 rounded-md bg-muted px-1.5 text-center text-xs leading-5 font-bold tabular-nums">
                  {line.quantity}
                  <span className="sr-only"> ×</span>
                </span>
                {line.name}
              </p>
              {line.notes && (
                <p className="mt-0.5 pl-8 text-xs text-muted-foreground italic">&ldquo;{line.notes}&rdquo;</p>
              )}
            </div>
            <span className="shrink-0 tabular-nums">{formatPrice(line.lineTotalCents)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className={cn("tabular-nums", row.emphasis && "font-semibold text-forest")}>{row.value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <dt className="text-base font-bold">Total</dt>
          <dd className="text-xl font-black tabular-nums">{formatPrice(totals.totalCents)}</dd>
        </div>
      </dl>

      {estimated && (
        <p className="mt-3 text-xs text-muted-foreground">Estimated; confirmed by the kitchen</p>
      )}
      {footer}
    </section>
  );
}
