import { useId } from "react";
import { CircleAlert, PartyPopper } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const { minimumDeliverySubtotalCents, freeDeliveryThresholdCents, deliveryFeeCents } = siteConfig.ordering;

/** Delivery-minimum warning, or progress toward free delivery, for an estimated cart subtotal. */
export function DeliveryThreshold({ subtotalCents, className }: { subtotalCents: number; className?: string }) {
  const labelId = useId();

  if (subtotalCents < minimumDeliverySubtotalCents) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950",
          className,
        )}
      >
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Delivery orders start at {formatPrice(minimumDeliverySubtotalCents)}.</span>{" "}
          Add {formatPrice(minimumDeliverySubtotalCents - subtotalCents)} more, or switch to pickup.
        </p>
      </div>
    );
  }

  const unlocked = subtotalCents >= freeDeliveryThresholdCents;
  const percent = Math.min(100, Math.round((subtotalCents / freeDeliveryThresholdCents) * 100));

  return (
    <div className={cn("rounded-xl bg-muted/70 p-4", className)}>
      <p id={labelId} className="flex items-center gap-2 text-sm font-semibold">
        {unlocked ? (
          <>
            <PartyPopper className="size-4 shrink-0 text-forest" aria-hidden="true" />
            You&apos;ve unlocked free delivery
          </>
        ) : (
          <>Add {formatPrice(freeDeliveryThresholdCents - subtotalCents)} more for free delivery</>
        )}
      </p>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${formatPrice(subtotalCents)} of ${formatPrice(freeDeliveryThresholdCents)}`}
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-border"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
            unlocked ? "bg-forest" : "bg-ember",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!unlocked && (
        <p className="mt-2 text-xs text-muted-foreground">
          Delivery is {formatPrice(deliveryFeeCents)} on orders under {formatPrice(freeDeliveryThresholdCents)}.
        </p>
      )}
    </div>
  );
}
