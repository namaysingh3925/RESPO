"use client";

import { Bike, Clock, LoaderCircle, MapPin, MessageSquareText, Phone, ShoppingBag } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  canCancelOrder,
  formatAge,
  formatClock,
  isActiveOrder,
  minutesSince,
  nextOrderAction,
  pluralize,
  telHref,
} from "@/components/admin/utils";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/constants";
import { formatPrice, formatTime } from "@/lib/format";
import type { OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Active orders older than this get an amber age to catch anything stuck. */
const STALE_ORDER_MINUTES = 30;

interface OrderCardProps {
  order: OrderDTO;
  now: number;
  isPending: boolean;
  onChangeStatus: (order: OrderDTO, status: OrderStatus) => void;
}

export function OrderCard({ order, now, isPending, onChangeStatus }: OrderCardProps) {
  const action = nextOrderAction(order);
  const cancellable = canCancelOrder(order.status);
  const isNew = order.status === "PENDING";
  const isDelivery = order.fulfillment === "DELIVERY";
  const isStale = isActiveOrder(order) && minutesSince(order.createdAt, now) >= STALE_ORDER_MINUTES;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const titleId = `order-${order.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      aria-busy={isPending || undefined}
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border bg-card p-4 text-sm shadow-xs transition-opacity",
        isNew && "border-ember/60 ring-2 ring-ember/70",
        !isActiveOrder(order) && "bg-card/70",
        isPending && "opacity-80",
      )}
    >
      {isNew && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl ring-4 ring-ember/25 motion-safe:animate-pulse"
        />
      )}

      {/* Header: code, fulfillment, age */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 id={titleId} className="font-mono text-base font-bold tracking-tight">
            <span className="sr-only">Order </span>
            {order.code}
          </h3>
          <p className={cn("mt-0.5 text-xs text-muted-foreground", isStale && "font-semibold text-amber-700")}>
            <time dateTime={order.createdAt} title={`Placed at ${formatClock(order.createdAt)}`}>
              {formatAge(order.createdAt, now)}
            </time>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold uppercase tracking-wide",
            isDelivery ? "bg-charcoal text-cream" : "bg-cream text-charcoal ring-1 ring-charcoal/15 ring-inset",
          )}
        >
          {isDelivery ? (
            <Bike className="size-3.5" aria-hidden="true" />
          ) : (
            <ShoppingBag className="size-3.5" aria-hidden="true" />
          )}
          {isDelivery ? "Delivery" : "Pickup"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge kind="order" status={order.status} />
        <span className="inline-flex items-center gap-1 text-xs font-semibold">
          <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {order.requestedTime ? `For ${formatTime(order.requestedTime)}` : "ASAP"}
          {order.estimatedReadyAt && isActiveOrder(order) && (
            <span className="font-normal text-muted-foreground">
              · est. {formatClock(order.estimatedReadyAt)}
            </span>
          )}
        </span>
      </div>

      {/* Customer */}
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{order.customerName}</p>
        <a
          href={telHref(order.phone)}
          className="-mx-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm font-medium text-foreground underline-offset-4 hover:bg-muted hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Phone className="size-4 text-ember" aria-hidden="true" />
          <span className="sr-only">Call {order.customerName} at </span>
          {order.phone}
        </a>
        {order.deliveryAddress && (
          <address className="flex gap-2 text-sm not-italic">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              {order.deliveryAddress.line1}
              {order.deliveryAddress.line2 && `, ${order.deliveryAddress.line2}`}
              <br />
              {order.deliveryAddress.city} {order.deliveryAddress.postalCode}
              {order.deliveryAddress.instructions && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Driver note: {order.deliveryAddress.instructions}
                </span>
              )}
            </span>
          </address>
        )}
      </div>

      {/* Items */}
      <div className="border-t pt-3">
        <h4 className="sr-only">{pluralize(itemCount, "item")}</h4>
        <ul className="flex flex-col gap-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-2">
              <span className="min-w-7 shrink-0 font-bold tabular-nums">{item.quantity} ×</span>
              <span className="min-w-0">
                <span className="font-medium">{item.name}</span>
                {item.notes && (
                  <span className="block text-xs font-medium text-ember-dark">“{item.notes}”</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {order.notes && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200 ring-inset">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
          <span>
            <span className="font-semibold">Customer note: </span>
            {order.notes}
          </span>
        </p>
      )}

      {/* Totals */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-3">
        <p className="text-base font-bold tabular-nums">
          <span className="sr-only">Total </span>
          {formatPrice(order.totalCents)}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {pluralize(itemCount, "item")}
            {order.tipCents > 0 && ` · ${formatPrice(order.tipCents)} tip`}
          </span>
        </p>
        <PaymentLabel order={order} />
      </div>

      {(action || cancellable) && (
        <div className="flex flex-wrap items-center gap-2">
          {cancellable && (
            <ConfirmAction
              title={`Cancel order ${order.code}?`}
              description={`${order.customerName} will see this ${isDelivery ? "delivery" : "pickup"} order as cancelled on their tracking page. This can't be undone.`}
              confirmLabel="Cancel order"
              cancelLabel="Keep order"
              triggerLabel={`Cancel order ${order.code}`}
              disabled={isPending}
              onConfirm={() => onChangeStatus(order, "CANCELLED")}
            >
              Cancel
            </ConfirmAction>
          )}
          {action && (
            <Button
              type="button"
              disabled={isPending}
              onClick={() => onChangeStatus(order, action.status)}
              className="h-12 min-w-36 flex-1 rounded-full px-5 text-base font-semibold"
            >
              {isPending && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {action.label}
              <span className="sr-only"> — order {order.code}</span>
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function PaymentLabel({ order }: { order: OrderDTO }) {
  if (order.paymentStatus === "PAID") {
    return <span className="text-xs font-semibold text-emerald-700">Paid</span>;
  }
  if (order.paymentStatus === "REFUNDED") {
    return <span className="text-xs font-semibold text-muted-foreground">Refunded</span>;
  }
  const where =
    order.paymentMethod === "PAY_IN_PERSON"
      ? order.fulfillment === "DELIVERY"
        ? "collect on delivery"
        : "collect at pickup"
      : "card";
  return (
    <span className="text-xs font-semibold text-amber-800">
      Unpaid <span className="font-normal text-muted-foreground">· {where}</span>
    </span>
  );
}
