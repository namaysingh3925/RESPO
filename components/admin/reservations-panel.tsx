"use client";

import { useCallback, useMemo } from "react";
import {
  CalendarX,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquareText,
  PartyPopper,
  Phone,
  RotateCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { StatusBadge } from "@/components/admin/status-badge";
import { SyncStatus } from "@/components/admin/sync-status";
import { useLiveList, type LiveList } from "@/components/admin/use-live-list";
import {
  isIsoDate,
  isLiveReservation,
  pluralize,
  reservationActions,
  shiftIsoDate,
  telHref,
  type ReservationAction,
} from "@/components/admin/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import type { ReservationStatus } from "@/lib/constants";
import { formatDateLabel, formatTime } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import type { ReservationDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export const RESERVATIONS_POLL_MS = 30_000;

// ---------- Data ----------

function buildReservationsUrl(date: string): string {
  return `/api/admin/reservations?date=${encodeURIComponent(date)}`;
}

function selectReservations(data: unknown): ReservationDTO[] {
  const reservations = (data as { reservations?: unknown } | null)?.reservations;
  if (!Array.isArray(reservations)) {
    throw new Error("Unexpected response from the reservations API");
  }
  return reservations as ReservationDTO[];
}

interface UseReservationsLiveListOptions {
  /** Restaurant-local "YYYY-MM-DD" the initial reservations belong to. */
  initialDate: string;
  initialReservations: ReservationDTO[];
  /** Epoch ms when `initialReservations` were loaded on the server. */
  serverNow: number;
}

/** Bookings for one restaurant-local date (the list key), polled every 30 s and on focus. */
export function useReservationsLiveList({ initialDate, initialReservations, serverNow }: UseReservationsLiveListOptions) {
  return useLiveList<ReservationDTO>({
    initialKey: initialDate,
    initialItems: initialReservations,
    initialFetchedAt: serverNow,
    buildUrl: buildReservationsUrl,
    select: selectReservations,
    pollMs: RESERVATIONS_POLL_MS,
  });
}

/** Bookings that still hold a table (not cancelled or no-show). */
export function countLiveReservations(reservations: readonly ReservationDTO[]): number {
  return reservations.filter((reservation) => isLiveReservation(reservation.status)).length;
}

interface DayStats {
  bookings: number;
  released: number;
  covers: number;
  guestsToArrive: number;
  seatedParties: number;
  seatedGuests: number;
  completed: number;
}

function summarize(reservations: readonly ReservationDTO[]): DayStats {
  const stats: DayStats = {
    bookings: 0,
    released: 0,
    covers: 0,
    guestsToArrive: 0,
    seatedParties: 0,
    seatedGuests: 0,
    completed: 0,
  };
  for (const { status, partySize } of reservations) {
    if (!isLiveReservation(status)) {
      stats.released += 1;
      continue;
    }
    stats.bookings += 1;
    stats.covers += partySize;
    if (status === "PENDING" || status === "CONFIRMED") stats.guestsToArrive += partySize;
    if (status === "SEATED") {
      stats.seatedParties += 1;
      stats.seatedGuests += partySize;
    }
    if (status === "COMPLETED") stats.completed += 1;
  }
  return stats;
}

interface SlotGroup {
  time: string;
  reservations: ReservationDTO[];
  liveBookings: number;
  liveCovers: number;
}

/** Groups by slot time (earliest first); within a slot, bookings still holding a table come first. */
function groupBySlot(reservations: readonly ReservationDTO[]): SlotGroup[] {
  const sorted = [...reservations].sort((a, b) => {
    if (a.time !== b.time) return a.time < b.time ? -1 : 1;
    return Number(isLiveReservation(b.status)) - Number(isLiveReservation(a.status));
  });
  const groups: SlotGroup[] = [];
  for (const reservation of sorted) {
    let group = groups.at(-1);
    if (!group || group.time !== reservation.time) {
      group = { time: reservation.time, reservations: [], liveBookings: 0, liveCovers: 0 };
      groups.push(group);
    }
    group.reservations.push(reservation);
    if (isLiveReservation(reservation.status)) {
      group.liveBookings += 1;
      group.liveCovers += reservation.partySize;
    }
  }
  return groups;
}

// ---------- Status changes ----------

function statusChangeMessage(reservation: ReservationDTO, status: ReservationStatus): string {
  const party = `party of ${reservation.partySize}`;
  switch (status) {
    case "CONFIRMED":
      return `${reservation.name}'s booking confirmed`;
    case "SEATED":
      return `${reservation.name} seated · ${party}`;
    case "COMPLETED":
      return `${reservation.name}'s table marked complete`;
    case "NO_SHOW":
      return `${reservation.name} marked as a no-show`;
    case "CANCELLED":
      return `${reservation.name}'s booking cancelled`;
    default:
      return `${reservation.name}'s booking updated`;
  }
}

async function changeReservationStatus(
  update: LiveList<ReservationDTO>["update"],
  reservation: ReservationDTO,
  status: ReservationStatus,
) {
  const optimistic: ReservationDTO = { ...reservation, status, updatedAt: new Date().toISOString() };
  const result = await update(reservation, optimistic, () =>
    apiFetch<ReservationDTO>(`/api/admin/reservations/${encodeURIComponent(reservation.id)}/status`, {
      method: "PATCH",
      json: { status },
    }),
  );

  if (result.ok) {
    toast.success(statusChangeMessage(result.item, result.item.status), { duration: 3_000 });
  } else {
    toast.error(`Couldn't update ${reservation.name}'s booking`, { description: result.message });
  }
}

function relativeDayLabel(date: string, today: string): string | null {
  if (date === today) return "Today";
  if (date === shiftIsoDate(today, 1)) return "Tomorrow";
  if (date === shiftIsoDate(today, -1)) return "Yesterday";
  return null;
}

// ---------- Panel ----------

interface ReservationsPanelProps {
  list: LiveList<ReservationDTO>;
  /** Restaurant-local "YYYY-MM-DD" for today. */
  today: string;
}

export function ReservationsPanel({ list, today }: ReservationsPanelProps) {
  const { key: date, items, update, pendingIds, setKey } = list;
  const stats = useMemo(() => summarize(items), [items]);
  const groups = useMemo(() => groupBySlot(items), [items]);
  const onChangeStatus = useCallback(
    (reservation: ReservationDTO, status: ReservationStatus) => {
      void changeReservationStatus(update, reservation, status);
    },
    [update],
  );

  const dateLabel = formatDateLabel(date);
  const relative = relativeDayLabel(date, today);
  const hasFailedLoad = list.error !== null && list.lastUpdated === null;
  const showStats = !list.isLoading && !hasFailedLoad;

  return (
    <section aria-labelledby="reservations-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Reservations{relative && <span className="text-ember-dark"> · {relative}</span>}
          </p>
          <h2 id="reservations-heading" className="text-xl font-bold tracking-tight">
            {dateLabel}
          </h2>
        </div>
        <SyncStatus
          lastUpdated={list.lastUpdated}
          isRefreshing={list.isRefreshing}
          error={hasFailedLoad ? null : list.error}
          onRefresh={list.refresh}
          cadence="every 30 s"
          refreshLabel="Refresh reservations"
        />
      </div>

      {/* Date controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <Button
            type="button"
            variant="outline"
            onClick={() => setKey(shiftIsoDate(date, -1))}
            className="size-12 shrink-0 rounded-full p-0"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
            <span className="sr-only">Previous day</span>
          </Button>
          <label htmlFor="reservations-date" className="sr-only">
            Show reservations for date
          </label>
          <Input
            id="reservations-date"
            type="date"
            value={date}
            onChange={(event) => {
              if (isIsoDate(event.target.value)) setKey(event.target.value);
            }}
            className="h-12 min-w-0 flex-1 rounded-full px-4 text-base font-semibold md:text-base sm:w-52 sm:flex-none"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setKey(shiftIsoDate(date, 1))}
            className="size-12 shrink-0 rounded-full p-0"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
            <span className="sr-only">Next day</span>
          </Button>
        </div>
        {date !== today && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setKey(today)}
            className="h-12 rounded-full px-5 text-sm font-semibold"
          >
            Back to today
          </Button>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {list.isLoading
          ? `Loading reservations for ${dateLabel}`
          : hasFailedLoad
            ? `Couldn't load reservations for ${dateLabel}`
            : `${dateLabel}: ${pluralize(stats.bookings, "booking")}, ${pluralize(stats.covers, "guest")}`}
      </p>

      {/* Summary */}
      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile
          label="Bookings"
          value={showStats ? stats.bookings : null}
          detail={stats.released > 0 ? `${stats.released} cancelled or no-show` : "Tables held"}
        />
        <StatTile
          label="Covers"
          value={showStats ? stats.covers : null}
          detail={`${pluralize(stats.guestsToArrive, "guest")} to arrive`}
        />
        <StatTile
          label="Seated"
          value={showStats ? stats.seatedParties : null}
          detail={`${pluralize(stats.seatedGuests, "guest")} · ${stats.completed} done`}
        />
      </dl>

      {/* List */}
      {list.isLoading ? (
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : hasFailedLoad ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <p className="text-base font-semibold">Couldn&apos;t load reservations for {dateLabel}</p>
          <p className="text-sm">{list.error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={list.refresh}
            className="h-12 rounded-full px-6 text-base font-semibold"
          >
            <RotateCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-charcoal/15 px-6 py-12 text-center">
          <CalendarX className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-base font-semibold">No bookings for {relative ? relative.toLowerCase() : dateLabel}</p>
          <p className="max-w-xs text-sm text-muted-foreground">New online reservations show up here automatically.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <SlotSection
              key={group.time}
              group={group}
              pendingIds={pendingIds}
              onChangeStatus={onChangeStatus}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StatTile({ label, value, detail }: { label: string; value: number | null; detail: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl border bg-card p-3 shadow-xs sm:p-4">
      <dt className="truncate text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-black tabular-nums sm:text-3xl">
        {value === null ? <span className="text-muted-foreground">–</span> : value}
      </dd>
      <dd className={cn("text-xs text-muted-foreground", value === null && "invisible")}>{detail}</dd>
    </div>
  );
}

interface SlotSectionProps {
  group: SlotGroup;
  pendingIds: ReadonlySet<string>;
  onChangeStatus: (reservation: ReservationDTO, status: ReservationStatus) => void;
}

function SlotSection({ group, pendingIds, onChangeStatus }: SlotSectionProps) {
  const headingId = `reservation-slot-${group.time.replace(":", "")}`;
  const { maxCoversPerSlot } = siteConfig.reservations;
  const full = group.liveCovers >= maxCoversPerSlot;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-charcoal/10 pb-2">
        <h3 id={headingId} className="text-lg font-black tabular-nums tracking-tight">
          {formatTime(group.time)}
        </h3>
        <p className={cn("text-xs text-muted-foreground", full && "font-semibold text-amber-800")}>
          {pluralize(group.liveBookings, "booking")} · {group.liveCovers} of {maxCoversPerSlot} covers
          {full && " · full"}
        </p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {group.reservations.map((reservation) => (
          <li key={reservation.id} className="min-w-0">
            <ReservationRow
              reservation={reservation}
              isPending={pendingIds.has(reservation.id)}
              onChangeStatus={onChangeStatus}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ReservationRowProps {
  reservation: ReservationDTO;
  isPending: boolean;
  onChangeStatus: (reservation: ReservationDTO, status: ReservationStatus) => void;
}

function ReservationRow({ reservation, isPending, onChangeStatus }: ReservationRowProps) {
  const actions = reservationActions(reservation.status);
  const forward = actions.filter((action) => !action.destructive);
  const destructive = actions.filter((action) => action.destructive);
  const live = isLiveReservation(reservation.status);
  const time = formatTime(reservation.time);
  const titleId = `reservation-${reservation.id}-title`;
  const guests = pluralize(reservation.partySize, "guest");

  return (
    <article
      aria-labelledby={titleId}
      aria-busy={isPending || undefined}
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 text-sm shadow-xs transition-opacity sm:flex-row sm:items-start sm:justify-between",
        reservation.status === "SEATED" && "border-emerald-300 ring-1 ring-emerald-300",
        !live && "bg-card/60",
        isPending && "opacity-80",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h4 id={titleId} className={cn("text-base font-bold break-words", !live && "text-muted-foreground")}>
            {reservation.name}
          </h4>
          <span className="inline-flex min-h-6 items-center gap-1 rounded-full bg-cream px-2.5 text-xs font-bold text-charcoal ring-1 ring-charcoal/10 ring-inset">
            <Users className="size-3.5" aria-hidden="true" />
            {guests}
          </span>
          <StatusBadge kind="reservation" status={reservation.status} />
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{time}</span> ·{" "}
          <span className="font-mono">{reservation.code}</span>
        </p>

        <a
          href={telHref(reservation.phone)}
          className="-mx-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm font-medium text-foreground underline-offset-4 hover:bg-muted hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Phone className="size-4 text-ember" aria-hidden="true" />
          <span className="sr-only">Call {reservation.name} at </span>
          {reservation.phone}
        </a>

        {reservation.occasion && (
          <p className="flex items-center gap-2 text-sm font-medium">
            <PartyPopper className="size-4 shrink-0 text-ember" aria-hidden="true" />
            <span>
              <span className="sr-only">Occasion: </span>
              {reservation.occasion}
            </span>
          </p>
        )}

        {reservation.notes && (
          <p className="mt-1 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200 ring-inset">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
            <span className="min-w-0 break-words">
              <span className="font-semibold">Guest note: </span>
              {reservation.notes}
            </span>
          </p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:w-40 sm:shrink-0 sm:flex-col sm:items-stretch">
          {forward.map((action) => (
            <Button
              key={action.status}
              type="button"
              disabled={isPending}
              onClick={() => onChangeStatus(reservation, action.status)}
              className="h-12 min-w-28 flex-1 rounded-full px-5 text-base font-semibold sm:flex-none"
            >
              {isPending && (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              )}
              {action.label}
              <span className="sr-only">
                {" "}
                — {reservation.name}, {time}
              </span>
            </Button>
          ))}
          {destructive.map((action) => (
            <ConfirmAction
              key={action.status}
              {...confirmCopy(action, reservation, time)}
              triggerLabel={`${action.label} — ${reservation.name}, ${time}`}
              cancelLabel="Keep booking"
              disabled={isPending}
              onConfirm={() => onChangeStatus(reservation, action.status)}
              triggerClassName="flex-1 sm:flex-none"
            >
              {action.label}
            </ConfirmAction>
          ))}
        </div>
      )}
    </article>
  );
}

function confirmCopy(
  action: ReservationAction,
  reservation: ReservationDTO,
  time: string,
): { title: string; description: string; confirmLabel: string } {
  const table = `table for ${reservation.partySize} at ${time}`;
  if (action.status === "NO_SHOW") {
    return {
      title: `Mark ${reservation.name} as a no-show?`,
      description: `This releases their ${table}. This can't be undone.`,
      confirmLabel: "Mark no-show",
    };
  }
  return {
    title: `Cancel ${reservation.name}'s booking?`,
    description: `This releases their ${table} on ${formatDateLabel(reservation.date)}. Guests aren't emailed about it, so give them a call if they don't already know. This can't be undone.`,
    confirmLabel: "Cancel booking",
  };
}
