"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  Bike,
  Check,
  CircleAlert,
  CircleX,
  Clock,
  Copy,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { OrderSummary, type OrderSummaryLine } from "@/components/order/order-summary";
import { formatOrderDate, formatOrderTime, restaurantWallClock } from "@/components/order/order-time";
import { StatusTimeline, describeOrderStatus, orderStatusLabel } from "@/components/order/status-timeline";
import { Button } from "@/components/ui/button";
import { useRestaurantClock } from "@/hooks/use-restaurant-clock";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { OrderStatus } from "@/lib/constants";
import { formatPrice, formatTime, toMinutes } from "@/lib/format";
import { directionsUrl, siteConfig } from "@/lib/site-config";
import type { OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 15_000;
const TERMINAL_STATUSES: readonly OrderStatus[] = ["COMPLETED", "CANCELLED"];
/** Background polls only surface a problem after this many failures in a row. */
const FAILURES_BEFORE_NOTICE = 2;

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "friend";
}

function paymentNote(order: OrderDTO): string {
  if (order.paymentStatus === "PAID") return `Paid ${formatPrice(order.totalCents)}. Thank you!`;
  if (order.paymentStatus === "REFUNDED") return "This order was refunded.";
  if (order.status === "CANCELLED") return "Nothing to pay. This order was cancelled.";
  return order.fulfillment === "DELIVERY"
    ? `Pay ${formatPrice(order.totalCents)} in person when your order arrives.`
    : `Pay ${formatPrice(order.totalCents)} at the counter when you collect your order.`;
}

/** Live tracking view for one order: status timeline (polled every 15 s), ETA, items, address and help. */
export function OrderTracker({ initialOrder }: { initialOrder: OrderDTO }) {
  const [order, setOrder] = useState(initialOrder);
  const [announcement, setAnnouncement] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [syncProblem, setSyncProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const latestRef = useRef(initialOrder);
  const requestRef = useRef<AbortController | null>(null);
  const failuresRef = useRef(0);
  const copyTimerRef = useRef<number | undefined>(undefined);
  const clock = useRestaurantClock();

  const statusHeadingId = useId();
  const summaryHeadingId = useId();
  const detailsHeadingId = useId();
  const helpHeadingId = useId();

  const { code, fulfillment } = order;
  const isDelivery = fulfillment === "DELIVERY";
  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const isCancelled = order.status === "CANCELLED";
  const statusLabel = orderStatusLabel(order.status, fulfillment);

  // ---------- Live updates ----------

  async function refresh(manual: boolean) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    if (manual) setRefreshing(true);

    try {
      const next = await apiFetch<OrderDTO>(`/api/orders/${encodeURIComponent(code)}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (controller.signal.aborted) return;

      const previous = latestRef.current;
      latestRef.current = next;
      failuresRef.current = 0;
      setSyncProblem(null);

      if (next.status !== previous.status || next.updatedAt !== previous.updatedAt) setOrder(next);
      if (next.status !== previous.status) {
        setAnnouncement(
          `Order update: ${orderStatusLabel(next.status, next.fulfillment)}. ${describeOrderStatus(next.status, next.fulfillment)}`,
        );
      } else if (manual) {
        setAnnouncement(`No change yet: ${orderStatusLabel(next.status, next.fulfillment)}.`);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      failuresRef.current += 1;
      if (error instanceof ApiError && error.code === "NOT_FOUND") {
        setSyncProblem(`We couldn't find this order anymore. Please call us at ${siteConfig.phone}.`);
      } else if (manual || failuresRef.current >= FAILURES_BEFORE_NOTICE) {
        setSyncProblem("We couldn't check for updates just now. We'll keep trying.");
      }
    } finally {
      if (manual) setRefreshing(false);
    }
  }

  const pollNow = useEffectEvent(() => {
    void refresh(false);
  });

  // Poll while the order is still moving and the tab is visible; catch up immediately when the tab returns.
  useEffect(() => {
    if (isTerminal) return;
    let timer: number | undefined;
    const start = () => {
      if (timer === undefined) timer = window.setInterval(() => pollNow(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollNow();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isTerminal]);

  // Abort an in-flight request and pending timers when leaving the page.
  useEffect(() => {
    const request = requestRef;
    const copyTimer = copyTimerRef;
    return () => {
      request.current?.abort();
      window.clearTimeout(copyTimer.current);
    };
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
      toast.success("Order code copied");
    } catch {
      toast.error(`Couldn't copy the code. Your order code is ${code}.`);
    }
  }

  // ---------- Derived display values ----------

  const eta = order.estimatedReadyAt ? restaurantWallClock(order.estimatedReadyAt) : null;
  // Client-only (clock is null during SSR), so the countdown never causes a hydration mismatch.
  const minutesLeft = clock && eta && clock.date === eta.date ? toMinutes(eta.time) - toMinutes(clock.time) : null;
  const readyForPickup = order.status === "READY" && !isDelivery;
  const showEta = !isTerminal && !readyForPickup && order.estimatedReadyAt !== null;

  const etaLabel = order.requestedTime
    ? isDelivery
      ? "Scheduled delivery"
      : "Scheduled pickup"
    : isDelivery
      ? "Estimated arrival"
      : "Estimated ready time";

  let countdown: string | null = null;
  if (minutesLeft !== null) {
    if (minutesLeft > 1) countdown = `In about ${minutesLeft} minutes`;
    else if (minutesLeft >= 0) countdown = "Any minute now";
    else countdown = "Running a little behind. Thanks for your patience.";
  }

  const lead = isCancelled
    ? `If you weren't expecting this, give us a call at ${siteConfig.phone} and we'll sort it out.`
    : order.status === "COMPLETED"
      ? `Thanks for ordering from ${siteConfig.name}. We hope to cook for you again soon.`
      : `Your ${isDelivery ? "delivery" : "pickup"} order is in. This page updates on its own, so keep it open to follow along.`;

  const summaryLines: OrderSummaryLine[] = order.items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    lineTotalCents: item.lineTotalCents,
    notes: item.notes,
  }));
  const phoneDigits = order.phone.replace(/\D/g, "");

  return (
    <div className="grid items-start gap-6 pt-8 sm:pt-12 md:grid-cols-[minmax(0,1fr)_20rem] md:grid-rows-[auto_auto_auto_1fr] lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-x-10 lg:pt-14">
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      {/* Header */}
      <header className="min-w-0 md:col-span-2">
        <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-foreground uppercase">
          <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-ember" />
          {isDelivery ? "Delivery" : "Pickup"} order
        </p>
        <h1 className="mt-3 text-4xl leading-[0.9] font-black tracking-tighter text-balance text-charcoal uppercase [overflow-wrap:anywhere] sm:text-6xl lg:text-7xl">
          {isCancelled ? "Order cancelled" : `Thanks, ${firstName(order.customerName)}!`}
        </h1>
        <p className="mt-4 max-w-xl text-base text-pretty text-muted-foreground">{lead}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-0.5 pr-0.5 pl-4">
            <span className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">Order</span>
            <span className="font-mono text-base font-bold tracking-wider">{code}</span>
            <button
              type="button"
              onClick={copyCode}
              aria-label={copied ? "Order code copied" : `Copy order code ${code}`}
              className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {copied ? (
                <Check className="size-4 text-forest" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold">
            {isDelivery ? (
              <Bike className="size-4 text-ember" aria-hidden="true" />
            ) : (
              <ShoppingBag className="size-4 text-ember" aria-hidden="true" />
            )}
            {isDelivery ? "Delivery" : "Pickup"}
          </span>
          <span className="px-1 text-sm text-muted-foreground">
            Placed {formatOrderDate(order.createdAt)} at{" "}
            <time dateTime={order.createdAt}>{formatOrderTime(order.createdAt)}</time>
          </span>
        </div>
      </header>

      {/* Status */}
      <section
        aria-labelledby={statusHeadingId}
        className={cn(
          "min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6 md:col-start-1 md:row-start-2",
          isCancelled && "border-destructive/40",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={statusHeadingId} className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
              Order status
            </h2>
            <p className={cn("mt-1 text-2xl font-black tracking-tight", isCancelled && "text-destructive")}>
              {statusLabel}
            </p>
          </div>
          {!isTerminal && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void refresh(true)}
              disabled={refreshing}
              className="h-11 rounded-full px-4"
            >
              <RefreshCw
                className={cn(refreshing && "animate-spin motion-reduce:animate-none")}
                aria-hidden="true"
              />
              {refreshing ? "Checking…" : "Refresh"}
            </Button>
          )}
        </div>

        {!isTerminal && (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live. Checks for updates every 15 seconds.
          </p>
        )}

        {isCancelled && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-semibold text-destructive">This order was cancelled</p>
              <p className="mt-1 text-foreground">
                You won&apos;t be charged. Questions? Call us at{" "}
                <a
                  href={siteConfig.phoneHref}
                  className="font-semibold underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {siteConfig.phone}
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {showEta && order.estimatedReadyAt && (
          <div className="mt-5 flex items-center gap-4 rounded-xl bg-cream p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-background text-ember">
              <Clock className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{etaLabel}</p>
              <p className="text-2xl leading-tight font-black tabular-nums">
                {order.requestedTime ? (
                  formatTime(order.requestedTime)
                ) : (
                  <>
                    <span aria-hidden="true">~</span>
                    <span className="sr-only">About </span>
                    {formatOrderTime(order.estimatedReadyAt)}
                  </>
                )}
              </p>
              {countdown && <p className="text-sm text-muted-foreground">{countdown}</p>}
            </div>
          </div>
        )}

        {readyForPickup && (
          <div className="mt-5 flex items-start gap-4 rounded-xl bg-forest p-4 text-cream">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream/15">
              <PackageCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold">Your order is ready</p>
              <p className="mt-0.5 text-sm text-cream/85">
                Head to the counter at {siteConfig.address.street} and mention order {code}.
              </p>
            </div>
          </div>
        )}

        <StatusTimeline order={order} className="mt-6" />

        {syncProblem && (
          <p role="status" className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {syncProblem}
          </p>
        )}
      </section>

      {/* Items and totals: sticky right column on md+ */}
      <div className="min-w-0 md:sticky md:top-20 md:col-start-2 md:row-span-3 md:row-start-2">
        <OrderSummary
          lines={summaryLines}
          totals={order}
          fulfillment={fulfillment}
          headingId={summaryHeadingId}
          footer={
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted/70 p-3 text-sm">
              <Wallet className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden="true" />
              {paymentNote(order)}
            </p>
          }
        />
      </div>

      {/* Where + when */}
      <section
        aria-labelledby={detailsHeadingId}
        className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6 md:col-start-1 md:row-start-3"
      >
        <h2 id={detailsHeadingId} className="text-lg font-bold">
          {isDelivery ? "Delivering to" : "Pick up from"}
        </h2>
        <div className="mt-3 flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-ember" aria-hidden="true" />
          {isDelivery && order.deliveryAddress ? (
            <address className="min-w-0 not-italic">
              <span className="block font-semibold">
                {order.deliveryAddress.line1}
                {order.deliveryAddress.line2 && `, ${order.deliveryAddress.line2}`}
              </span>
              <span className="block text-muted-foreground">
                {order.deliveryAddress.city} {order.deliveryAddress.postalCode}
              </span>
            </address>
          ) : (
            <address className="min-w-0 not-italic">
              <span className="block font-semibold">{siteConfig.name}</span>
              <span className="block text-muted-foreground">{siteConfig.address.street}</span>
              <span className="block text-muted-foreground">
                {siteConfig.address.city}, {siteConfig.address.region} {siteConfig.address.postalCode}
              </span>
            </address>
          )}
        </div>

        {!isDelivery && (
          <Button asChild variant="outline" className="mt-4 h-11 rounded-full px-5">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation aria-hidden="true" />
              Directions
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        )}

        <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">When</dt>
            <dd className="mt-0.5 font-medium">
              {order.requestedTime ? `Scheduled for ${formatTime(order.requestedTime)}` : "As soon as possible"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">We&apos;ll call if needed</dt>
            <dd className="mt-0.5 font-medium">
              <span aria-hidden="true">{order.phone}</span>
              <span className="sr-only">
                {phoneDigits ? `Phone number ending in ${phoneDigits.split("").join(" ")}` : "Your phone number"}
              </span>
            </dd>
          </div>
          {isDelivery && order.deliveryAddress?.instructions && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Delivery instructions</dt>
              <dd className="mt-0.5 font-medium">&ldquo;{order.deliveryAddress.instructions}&rdquo;</dd>
            </div>
          )}
          {order.notes && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Your note</dt>
              <dd className="mt-0.5 font-medium break-words">&ldquo;{order.notes}&rdquo;</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Help */}
      <section
        aria-labelledby={helpHeadingId}
        className="min-w-0 rounded-2xl bg-charcoal p-5 text-cream sm:p-6 md:col-start-1 md:row-start-4"
      >
        <h2 id={helpHeadingId} className="text-lg font-bold">
          Questions about your order?
        </h2>
        <p className="mt-1 text-sm text-cream/80">
          Call {siteConfig.phone} and mention order {code}. We&apos;re happy to help.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <Button asChild className="h-12 rounded-full px-6 text-base">
            <a href={siteConfig.phoneHref}>
              <Phone aria-hidden="true" />
              Call {siteConfig.phone}
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-cream/30 bg-transparent px-6 text-base text-cream hover:bg-cream/10 hover:text-cream"
          >
            <Link href="/menu">Order again</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
