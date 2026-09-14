"use client";

import { useSyncExternalStore } from "react";
import { CalendarDays, ReceiptText } from "lucide-react";
import { useNow } from "@/components/admin/hooks";
import { OrdersBoard, useOrdersLiveList } from "@/components/admin/orders-board";
import {
  countLiveReservations,
  ReservationsPanel,
  useReservationsLiveList,
} from "@/components/admin/reservations-panel";
import { isActiveOrder } from "@/components/admin/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRestaurantClock } from "@/hooks/use-restaurant-clock";
import { formatDateLabel } from "@/lib/format";
import type { OrderDTO, ReservationDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------- Remembered tab (localStorage, read after hydration) ----------

type AdminTab = "orders" | "reservations";

const TAB_STORAGE_KEY = "ember-house:admin-tab";
const DEFAULT_TAB: AdminTab = "orders";

const tabListeners = new Set<() => void>();
/** Fallback when localStorage is unavailable (private mode, blocked storage). */
let sessionTab: AdminTab | null = null;

function isAdminTab(value: unknown): value is AdminTab {
  return value === "orders" || value === "reservations";
}

function subscribeTab(listener: () => void) {
  tabListeners.add(listener);
  return () => {
    tabListeners.delete(listener);
  };
}

function readTab(): AdminTab {
  if (sessionTab) return sessionTab;
  try {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (isAdminTab(stored)) return stored;
  } catch {
    // Storage blocked — fall through to the default.
  }
  return DEFAULT_TAB;
}

/** The server and the hydrating render always show the default tab; the stored one follows right after. */
function readServerTab(): AdminTab {
  return DEFAULT_TAB;
}

function selectTab(tab: AdminTab) {
  sessionTab = tab;
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // Storage blocked — the choice still lasts for this visit.
  }
  tabListeners.forEach((notify) => notify());
}

function showOrdersTab() {
  selectTab("orders");
}

// ---------- Dashboard ----------

interface AdminDashboardProps {
  /** Restaurant-local "YYYY-MM-DD" the server loaded reservations for. */
  initialDate: string;
  initialOrders: OrderDTO[];
  initialReservations: ReservationDTO[];
  /** Epoch ms when the server loaded the data; seeds the relative-time clock. */
  serverNow: number;
}

export function AdminDashboard({ initialDate, initialOrders, initialReservations, serverNow }: AdminDashboardProps) {
  const tab = useSyncExternalStore(subscribeTab, readTab, readServerTab);
  const now = useNow(serverNow);
  const clock = useRestaurantClock();
  const today = clock?.date ?? initialDate;

  // Both lists live here so they keep polling (and new-order toasts keep firing) whichever tab is open.
  const orders = useOrdersLiveList({ initialOrders, serverNow, onShowOrders: showOrdersTab });
  const reservations = useReservationsLiveList({ initialDate, initialReservations, serverNow });

  const activeOrders = orders.items.filter(isActiveOrder).length;
  const newOrders = orders.items.filter((order) => order.status === "PENDING").length;
  const bookings = countLiveReservations(reservations.items);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ember-dark">Service board</p>
        <h1 className="text-3xl leading-[0.9] font-black tracking-tighter uppercase sm:text-4xl">
          {formatDateLabel(today)}
        </h1>
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isAdminTab(value)) selectTab(value);
        }}
        className="gap-5"
      >
        <TabsList
          aria-label="Staff views"
          className="grid w-full grid-cols-2 gap-1 rounded-full bg-charcoal/5 p-1 group-data-horizontal/tabs:h-auto sm:inline-grid sm:w-auto"
        >
          <TabsTrigger
            value="orders"
            className="h-12 gap-2 rounded-full px-4 text-base font-semibold data-active:bg-charcoal data-active:text-cream sm:px-6"
          >
            <ReceiptText className="size-4" aria-hidden="true" />
            Orders
            <CountPill count={activeOrders} highlight={newOrders > 0} />
            <span className="sr-only">
              ({activeOrders} active{newOrders > 0 ? `, ${newOrders} new` : ""})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="reservations"
            className="h-12 gap-2 rounded-full px-4 text-base font-semibold data-active:bg-charcoal data-active:text-cream sm:px-6"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            <span className="sm:hidden">Bookings</span>
            <span className="hidden sm:inline">Reservations</span>
            <CountPill count={reservations.isLoading ? null : bookings} />
            <span className="sr-only">({reservations.isLoading ? "loading" : bookings})</span>
          </TabsTrigger>
        </TabsList>

        {/* Force-mounted so filters, expanded sections and scroll state survive switching tabs. */}
        <TabsContent value="orders" forceMount className="min-w-0 data-[state=inactive]:hidden">
          <OrdersBoard list={orders} now={now} />
        </TabsContent>
        <TabsContent value="reservations" forceMount className="min-w-0 data-[state=inactive]:hidden">
          <ReservationsPanel list={reservations} today={today} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CountPill({ count, highlight = false }: { count: number | null; highlight?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
        highlight ? "bg-ember text-white" : "bg-current/10",
      )}
    >
      {count ?? "–"}
    </span>
  );
}
