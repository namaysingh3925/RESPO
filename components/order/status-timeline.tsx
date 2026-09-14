import { Check, X } from "lucide-react";
import { formatOrderTime } from "@/components/order/order-time";
import { ORDER_STATUS_LABELS, type FulfillmentType, type OrderStatus } from "@/lib/constants";
import type { OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

const PICKUP_STEPS: readonly OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
const DELIVERY_STEPS: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
];

type StepState = "complete" | "current" | "upcoming" | "cancelled";

const STATE_TEXT: Record<StepState, string> = {
  complete: "done",
  current: "current step",
  upcoming: "not started yet",
  cancelled: "order cancelled",
};

/** ORDER_STATUS_LABELS, except a ready pickup order reads "Ready for pickup". */
export function orderStatusLabel(status: OrderStatus, fulfillment: FulfillmentType): string {
  return status === "READY" && fulfillment === "PICKUP" ? "Ready for pickup" : ORDER_STATUS_LABELS[status];
}

/** One-line explanation of a status, worded for how the order is being fulfilled. */
export function describeOrderStatus(status: OrderStatus, fulfillment: FulfillmentType): string {
  const delivery = fulfillment === "DELIVERY";
  switch (status) {
    case "PENDING":
      return "We've sent your order to the kitchen. It'll be confirmed shortly.";
    case "CONFIRMED":
      return "The kitchen has accepted your order.";
    case "PREPARING":
      return "Your food is on the fire.";
    case "READY":
      return delivery ? "Packed up and about to head your way." : "Your order is ready. Come grab it at the counter.";
    case "OUT_FOR_DELIVERY":
      return "Your order is on its way to you.";
    case "COMPLETED":
      return delivery ? "Delivered. Enjoy your meal!" : "Picked up. Enjoy your meal!";
    case "CANCELLED":
      return "This order was cancelled and won't be prepared.";
  }
}

/** The step list for an order: delivery adds "Out for delivery" before "Completed". */
export function orderSteps(fulfillment: FulfillmentType): readonly OrderStatus[] {
  return fulfillment === "DELIVERY" ? DELIVERY_STEPS : PICKUP_STEPS;
}

/** Latest time the order entered `status`, from its status history (oldest first). */
function enteredAt(history: OrderDTO["statusHistory"], status: OrderStatus): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].status === status) return history[i].at;
  }
  return null;
}

interface Row {
  status: OrderStatus;
  state: StepState;
  at: string | null;
}

function buildRows(order: Pick<OrderDTO, "status" | "fulfillment" | "statusHistory">): Row[] {
  const steps = orderSteps(order.fulfillment);
  const history = order.statusHistory;

  if (order.status === "CANCELLED") {
    // Show how far the order got, then the cancellation. Steps it never reached are dropped.
    const reached = history.reduce((max, event) => Math.max(max, steps.indexOf(event.status)), 0);
    return [
      ...steps.slice(0, reached + 1).map((status): Row => ({ status, state: "complete", at: enteredAt(history, status) })),
      { status: "CANCELLED", state: "cancelled", at: enteredAt(history, "CANCELLED") },
    ];
  }

  const currentIndex = Math.max(0, steps.indexOf(order.status));
  const finished = order.status === "COMPLETED";
  return steps.map((status, index): Row => ({
    status,
    state: index < currentIndex || (finished && index === currentIndex) ? "complete" : index === currentIndex ? "current" : "upcoming",
    at: index <= currentIndex ? enteredAt(history, status) : null,
  }));
}

interface StatusTimelineProps {
  order: Pick<OrderDTO, "status" | "fulfillment" | "statusHistory">;
  className?: string;
}

/**
 * Vertical order-progress timeline. The current step pulses (motion-safe only); a cancelled order shows the
 * steps it reached followed by a distinct cancelled step.
 */
export function StatusTimeline({ order, className }: StatusTimelineProps) {
  const rows = buildRows(order);
  const currentStatus = order.status;

  return (
    <ol aria-label="Order progress" className={cn("relative", className)}>
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        const label = orderStatusLabel(row.status, order.fulfillment);
        const showHint = row.status === currentStatus && row.state !== "upcoming";

        return (
          <li
            key={row.status}
            aria-current={row.status === currentStatus ? "step" : undefined}
            className={cn("relative flex gap-4", !isLast && "pb-6")}
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-9 bottom-1 left-[15px] w-0.5 rounded-full",
                  row.state === "complete" ? "bg-forest" : "bg-border",
                )}
              />
            )}

            <span aria-hidden="true" className="relative grid size-8 shrink-0 place-items-center">
              {row.state === "complete" && (
                <span className="grid size-8 place-items-center rounded-full bg-forest text-cream">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
              {row.state === "current" && (
                <>
                  <span className="absolute inset-0 rounded-full bg-ember/35 motion-safe:animate-ping" />
                  <span className="relative grid size-8 place-items-center rounded-full bg-ember ring-4 ring-ember/20">
                    <span className="size-2.5 rounded-full bg-white" />
                  </span>
                </>
              )}
              {row.state === "upcoming" && <span className="size-8 rounded-full border-2 border-border bg-background" />}
              {row.state === "cancelled" && (
                <span className="grid size-8 place-items-center rounded-full bg-destructive text-white">
                  <X className="size-4" strokeWidth={3} />
                </span>
              )}
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p
                  className={cn(
                    "font-semibold",
                    row.state === "upcoming" && "font-medium text-muted-foreground",
                    row.state === "current" && "text-foreground",
                    row.state === "cancelled" && "text-destructive",
                  )}
                >
                  {label}
                  <span className="sr-only">, {STATE_TEXT[row.state]}</span>
                </p>
                {row.at && (
                  <time dateTime={row.at} className="text-sm text-muted-foreground tabular-nums">
                    {formatOrderTime(row.at)}
                  </time>
                )}
              </div>
              {showHint && (
                <p className="mt-0.5 text-sm text-muted-foreground">{describeOrderStatus(row.status, order.fulfillment)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
