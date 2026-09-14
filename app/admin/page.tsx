import { connection } from "next/server";
import { DatabaseZap, RotateCw } from "lucide-react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { restaurantNow } from "@/lib/format";
import { listOrders } from "@/lib/services/orders";
import { listReservations } from "@/lib/services/reservations";
import type { OrderDTO, ReservationDTO } from "@/lib/types";

type DashboardData =
  | { ok: true; date: string; fetchedAt: number; orders: OrderDTO[]; reservations: ReservationDTO[] }
  | { ok: false; message: string };

async function loadDashboardData(): Promise<DashboardData> {
  const { date } = restaurantNow();
  try {
    const [orders, reservations] = await Promise.all([listOrders({}), listReservations({ date })]);
    return { ok: true, date, fetchedAt: Date.now(), orders, reservations };
  } catch (error) {
    console.error("[admin] Failed to load the service board", error);
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export default async function AdminPage() {
  // Live operational data: render on every request, never from a prerendered or cached copy.
  await connection();
  const data = await loadDashboardData();

  if (!data.ok) {
    return <DashboardUnavailable message={data.message} />;
  }

  return (
    <AdminDashboard
      initialDate={data.date}
      initialOrders={data.orders}
      initialReservations={data.reservations}
      serverNow={data.fetchedAt}
    />
  );
}

function DashboardUnavailable({ message }: { message: string }) {
  const showDetails = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-6 sm:py-12">
      <h1 className="text-2xl font-black uppercase tracking-tight">Service board</h1>
      <section
        role="alert"
        aria-labelledby="dashboard-error-title"
        className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-700">
            <DatabaseZap className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="dashboard-error-title" className="text-lg font-bold">
              We couldn&apos;t load today&apos;s orders and bookings
            </h2>
            <p className="text-sm text-muted-foreground">
              The database isn&apos;t reachable or hasn&apos;t been set up yet. In the project folder, run this
              command to create and seed it, then reload the page:
            </p>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-charcoal px-4 py-3 font-mono text-sm text-cream">
          <code>npm run db:reset</code>
        </pre>
        {showDetails && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer py-2 font-semibold text-foreground">Error details</summary>
            <p className="mt-1 break-words font-mono">{message}</p>
          </details>
        )}
        <a
          href="/admin"
          className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <RotateCw className="size-4" aria-hidden="true" />
          Reload
        </a>
      </section>
    </div>
  );
}
