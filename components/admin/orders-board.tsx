"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, ChevronDown, Inbox } from "lucide-react";
import { toast } from "sonner";
import { OrderCard } from "@/components/admin/order-card";
import { SyncStatus } from "@/components/admin/sync-status";
import { useLiveList, type LiveList } from "@/components/admin/use-live-list";
import {
  compareOrders,
  isActiveOrder,
  ORDER_STATUS_SHORT_LABELS,
  pluralize,
} from "@/components/admin/utils";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiFetch } from "@/lib/api-client";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { formatPrice, formatTime } from "@/lib/format";
import type { OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export const ORDERS_POLL_MS = 15_000;

// ---------- Data ----------

/** The board always shows the restaurant's current day, so the key never changes. */
const ORDERS_KEY = "today";

/** GET /api/admin/orders defaults to today in the restaurant's time zone, so the board rolls over at midnight. */
function buildOrdersUrl(): string {
  return "/api/admin/orders";
}

function selectOrders(data: unknown): OrderDTO[] {
  const orders = (data as { orders?: unknown } | null)?.orders;
  if (!Array.isArray(orders)) {
    throw new Error("Unexpected response from the orders API");
  }
  return orders as OrderDTO[];
}

interface UseOrdersLiveListOptions {
  initialOrders: OrderDTO[];
  /** Epoch ms when `initialOrders` were loaded on the server. */
  serverNow: number;
  /** Called from the "View" action on new-order toasts (e.g. to switch to the Orders tab). Keep it stable. */
  onShowOrders?: () => void;
}

/** Today's orders, polled every 15 s and on focus, with a toast whenever a new order arrives. */
export function useOrdersLiveList({ initialOrders, serverNow, onShowOrders }: UseOrdersLiveListOptions) {
  const list = useLiveList<OrderDTO>({
    initialKey: ORDERS_KEY,
    initialItems: initialOrders,
    initialFetchedAt: serverNow,
    buildUrl: buildOrdersUrl,
    select: selectOrders,
    pollMs: ORDERS_POLL_MS,
  });
  useNewOrderToasts(list.items, onShowOrders);
  return list;
}

/** More arrivals than this in one refresh are summarised in a single toast. */
const MAX_INDIVIDUAL_ORDER_TOASTS = 3;

function describeOrder(order: OrderDTO): string {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return [
    order.fulfillment === "DELIVERY" ? "Delivery" : "Pickup",
    order.requestedTime ? `for ${formatTime(order.requestedTime)}` : "ASAP",
    pluralize(itemCount, "item"),
    formatPrice(order.totalCents),
  ].join(" · ");
}

function useNewOrderToasts(orders: OrderDTO[], onView?: () => void) {
  /** Ids already on the board; `null` until the first render has been recorded. */
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const seen = seenRef.current;
    if (seen === null) {
      seenRef.current = new Set(orders.map((order) => order.id));
      return;
    }

    const arrivals = orders.filter((order) => !seen.has(order.id));
    if (arrivals.length === 0) return;
    arrivals.forEach((order) => seen.add(order.id));

    const incoming = arrivals.filter((order) => order.status === "PENDING").sort(compareOrders);
    if (incoming.length === 0) return;

    const action = onView ? { label: "View", onClick: onView } : undefined;
    const icon = <BellRing className="size-4 text-ember" aria-hidden="true" />;
    if (incoming.length <= MAX_INDIVIDUAL_ORDER_TOASTS) {
      for (const order of incoming) {
        toast(`New order ${order.code}`, {
          id: `new-order-${order.id}`,
          description: `${order.customerName} · ${describeOrder(order)}`,
          duration: 12_000,
          icon,
          action,
        });
      }
    } else {
      toast(`${incoming.length} new orders`, {
        description: incoming.map((order) => order.code).join(", "),
        duration: 12_000,
        icon,
        action,
      });
    }
  }, [orders, onView]);
}

// ---------- Status changes ----------

const ORDER_STATUS_DONE_MESSAGES: Record<OrderStatus, string> = {
  PENDING: "is back to new",
  CONFIRMED: "accepted",
  PREPARING: "is being prepared",
  READY: "is ready",
  OUT_FOR_DELIVERY: "is out for delivery",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

async function changeOrderStatus(update: LiveList<OrderDTO>["update"], order: OrderDTO, status: OrderStatus) {
  const at = new Date().toISOString();
  const optimistic: OrderDTO = {
    ...order,
    status,
    updatedAt: at,
    // Mirrors the service: pay-in-person orders are settled when they're completed.
    paymentStatus: status === "COMPLETED" && order.paymentMethod === "PAY_IN_PERSON" ? "PAID" : order.paymentStatus,
    statusHistory: [...order.statusHistory, { status, at }],
  };

  const result = await update(order, optimistic, () =>
    apiFetch<OrderDTO>(`/api/admin/orders/${encodeURIComponent(order.id)}/status`, {
      method: "PATCH",
      json: { status },
    }),
  );

  if (result.ok) {
    toast.success(`Order ${order.code} ${ORDER_STATUS_DONE_MESSAGES[result.item.status]}`, { duration: 3_000 });
  } else {
    toast.error(`Couldn't update order ${order.code}`, { description: result.message });
  }
}

// ---------- Board ----------

type OrderFilter = "ACTIVE" | "ALL" | OrderStatus;

const FILTERS: readonly OrderFilter[] = ["ACTIVE", "ALL", ...ORDER_STATUSES];

const FILTER_LABELS: Record<OrderFilter, string> = {
  ACTIVE: "Active",
  ALL: "All",
  ...ORDER_STATUS_SHORT_LABELS,
};

function matchesFilter(order: OrderDTO, filter: OrderFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return isActiveOrder(order);
  return order.status === filter;
}

interface BoardColumn {
  id: string;
  title: string;
  statuses: readonly OrderStatus[];
  dot: string;
  empty: string;
}

const ACTIVE_COLUMNS: readonly BoardColumn[] = [
  { id: "new", title: "New", statuses: ["PENDING"], dot: "bg-ember", empty: "No new orders. They appear here automatically." },
  {
    id: "kitchen",
    title: "In the kitchen",
    statuses: ["CONFIRMED", "PREPARING"],
    dot: "bg-amber-500",
    empty: "Nothing on the line right now.",
  },
  {
    id: "ready",
    title: "Ready",
    statuses: ["READY", "OUT_FOR_DELIVERY"],
    dot: "bg-emerald-600",
    empty: "Nothing waiting for a guest or a driver.",
  },
];

interface OrdersBoardProps {
  list: LiveList<OrderDTO>;
  /** Epoch ms from useNow(), for order ages. */
  now: number;
}

export function OrdersBoard({ list, now }: OrdersBoardProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [filter, setFilter] = useState<OrderFilter>("ACTIVE");
  const [showDone, setShowDone] = useState(false);
  const { items, update, pendingIds } = list;

  const sorted = useMemo(() => [...items].sort(compareOrders), [items]);
  const onChangeStatus = useCallback(
    (order: OrderDTO, status: OrderStatus) => {
      void changeOrderStatus(update, order, status);
    },
    [update],
  );

  const activeCount = sorted.filter(isActiveOrder).length;
  const salesCents = sorted
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <section aria-labelledby="orders-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="orders-heading" className="text-xl font-bold tracking-tight">
            Today&apos;s orders
          </h2>
          <p className="text-sm text-muted-foreground">
            {pluralize(activeCount, "active order")} · {pluralize(sorted.length, "order")} today ·{" "}
            <span className="tabular-nums">{formatPrice(salesCents)}</span> in sales
          </p>
        </div>
        <SyncStatus
          lastUpdated={list.lastUpdated}
          isRefreshing={list.isRefreshing}
          error={list.error}
          onRefresh={list.refresh}
          cadence="every 15 s"
          refreshLabel="Refresh orders"
        />
      </div>

      {isDesktop ? (
        <OrderColumns
          orders={sorted}
          now={now}
          pendingIds={pendingIds}
          onChangeStatus={onChangeStatus}
          showDone={showDone}
          onToggleDone={() => setShowDone((open) => !open)}
        />
      ) : (
        <FilteredOrderList
          orders={sorted}
          now={now}
          pendingIds={pendingIds}
          onChangeStatus={onChangeStatus}
          filter={filter}
          onFilterChange={setFilter}
        />
      )}
    </section>
  );
}

interface OrderGroupProps {
  /** Already sorted with compareOrders. */
  orders: OrderDTO[];
  now: number;
  pendingIds: ReadonlySet<string>;
  onChangeStatus: (order: OrderDTO, status: OrderStatus) => void;
}

function OrderCardList({ orders, now, pendingIds, onChangeStatus, className }: OrderGroupProps & { className?: string }) {
  return (
    <ul className={cn("grid gap-3", className)}>
      {orders.map((order) => (
        <li key={order.id} className="min-w-0">
          <OrderCard order={order} now={now} isPending={pendingIds.has(order.id)} onChangeStatus={onChangeStatus} />
        </li>
      ))}
    </ul>
  );
}

// ---------- lg+: status columns ----------

function OrderColumns({
  orders,
  now,
  pendingIds,
  onChangeStatus,
  showDone,
  onToggleDone,
}: OrderGroupProps & { showDone: boolean; onToggleDone: () => void }) {
  const done = orders.filter((order) => !isActiveOrder(order));
  const completed = done.filter((order) => order.status === "COMPLETED").length;
  const cancelled = done.length - completed;

  return (
    <div
      className={cn(
        "grid items-start gap-4",
        showDone ? "grid-cols-4" : "grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,13rem)]",
      )}
    >
      {ACTIVE_COLUMNS.map((column) => {
        const columnOrders = orders.filter((order) => column.statuses.includes(order.status));
        return (
          <section key={column.id} aria-labelledby={`orders-column-${column.id}`} className="flex min-w-0 flex-col gap-3">
            <ColumnHeader id={`orders-column-${column.id}`} title={column.title} count={columnOrders.length} dot={column.dot} />
            {columnOrders.length > 0 ? (
              <OrderCardList orders={columnOrders} now={now} pendingIds={pendingIds} onChangeStatus={onChangeStatus} />
            ) : (
              <p className="rounded-2xl border border-dashed border-charcoal/15 px-4 py-8 text-center text-sm text-muted-foreground">
                {column.empty}
              </p>
            )}
          </section>
        );
      })}

      <section aria-labelledby="orders-column-done" className="flex min-w-0 flex-col gap-3">
        <ColumnHeader id="orders-column-done" title="Done" count={done.length} dot="bg-stone-400" />
        {done.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-charcoal/15 px-4 py-8 text-center text-sm text-muted-foreground">
            Completed and cancelled orders collect here.
          </p>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              aria-expanded={showDone}
              aria-controls="orders-done-list"
              onClick={onToggleDone}
              className="h-11 w-full justify-between rounded-full px-4 text-sm font-semibold"
            >
              {showDone ? "Hide done orders" : `Show ${done.length} done`}
              <ChevronDown
                className={cn("size-4 transition-transform motion-reduce:transition-none", showDone && "rotate-180")}
                aria-hidden="true"
              />
            </Button>
            {!showDone && (
              <p className="px-1 text-xs text-muted-foreground">
                {completed} completed · {cancelled} cancelled
              </p>
            )}
          </>
        )}
        <div id="orders-done-list">
          {showDone && done.length > 0 && (
            <OrderCardList orders={done} now={now} pendingIds={pendingIds} onChangeStatus={onChangeStatus} />
          )}
        </div>
      </section>
    </div>
  );
}

function ColumnHeader({ id, title, count, dot }: { id: string; title: string; count: number; dot: string }) {
  return (
    <div className="sticky top-14 z-10 -mx-1 flex items-center justify-between gap-2 bg-paper/95 px-1 py-2 backdrop-blur-sm">
      <h3 id={id} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]">
        <span aria-hidden="true" className={cn("size-2 rounded-full", dot)} />
        {title}
      </h3>
      <span className="inline-flex min-w-7 justify-center rounded-full bg-charcoal/5 px-2 py-0.5 text-xs font-bold tabular-nums">
        <span className="sr-only">{pluralize(count, "order")}</span>
        <span aria-hidden="true">{count}</span>
      </span>
    </div>
  );
}

// ---------- Below lg: one list filtered by chips ----------

function FilteredOrderList({
  orders,
  now,
  pendingIds,
  onChangeStatus,
  filter,
  onFilterChange,
}: OrderGroupProps & { filter: OrderFilter; onFilterChange: (filter: OrderFilter) => void }) {
  const visible = orders.filter((order) => matchesFilter(order, filter));

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Filter orders by status"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pt-1 pb-2 no-scrollbar sm:-mx-6 sm:px-6"
      >
        {FILTERS.map((option) => {
          const count = orders.filter((order) => matchesFilter(order, option)).length;
          const selected = option === filter;
          const alert = option === "PENDING" && count > 0;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onFilterChange(option)}
              className={cn(
                "inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
                selected ? "bg-charcoal text-cream ring-charcoal" : "bg-card text-foreground ring-border hover:bg-muted",
              )}
            >
              {FILTER_LABELS[option]}
              <span
                className={cn(
                  "inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                  alert ? "bg-ember text-white" : selected ? "bg-cream/15" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <OrderCardList
          orders={visible}
          now={now}
          pendingIds={pendingIds}
          onChangeStatus={onChangeStatus}
          className="sm:grid-cols-2"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-charcoal/15 px-6 py-12 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-base font-semibold">
            {filter === "ACTIVE"
              ? "No active orders right now"
              : filter === "ALL"
                ? "No orders yet today"
                : `Nothing marked “${FILTER_LABELS[filter]}”`}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            New orders show up here automatically{filter === "ACTIVE" || filter === "ALL" ? "" : " — try another filter"}.
          </p>
        </div>
      )}
    </div>
  );
}
