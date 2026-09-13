import {
  ORDER_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  type OrderStatus,
  type ReservationStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Tone {
  badge: string;
  dot: string;
}

/** Tinted background + dark text keeps every pairing above WCAG AA contrast; the label never relies on colour alone. */
const TONES = {
  ember: { badge: "bg-orange-100 text-orange-900 ring-orange-300", dot: "bg-ember" },
  sky: { badge: "bg-sky-100 text-sky-900 ring-sky-300", dot: "bg-sky-600" },
  amber: { badge: "bg-amber-100 text-amber-900 ring-amber-300", dot: "bg-amber-500" },
  emerald: { badge: "bg-emerald-100 text-emerald-900 ring-emerald-300", dot: "bg-emerald-600" },
  violet: { badge: "bg-violet-100 text-violet-900 ring-violet-300", dot: "bg-violet-600" },
  stone: { badge: "bg-stone-100 text-stone-700 ring-stone-300", dot: "bg-stone-500" },
  red: { badge: "bg-red-100 text-red-900 ring-red-300", dot: "bg-red-600" },
  ink: { badge: "bg-zinc-800 text-white ring-zinc-900", dot: "bg-zinc-300" },
} satisfies Record<string, Tone>;

const ORDER_TONES: Record<OrderStatus, Tone> = {
  PENDING: TONES.ember,
  CONFIRMED: TONES.sky,
  PREPARING: TONES.amber,
  READY: TONES.emerald,
  OUT_FOR_DELIVERY: TONES.violet,
  COMPLETED: TONES.stone,
  CANCELLED: TONES.red,
};

const RESERVATION_TONES: Record<ReservationStatus, Tone> = {
  PENDING: TONES.ember,
  CONFIRMED: TONES.sky,
  SEATED: TONES.emerald,
  COMPLETED: TONES.stone,
  CANCELLED: TONES.red,
  NO_SHOW: TONES.ink,
};

type StatusBadgeProps =
  | { kind: "order"; status: OrderStatus; className?: string }
  | { kind: "reservation"; status: ReservationStatus; className?: string };

export function StatusBadge(props: StatusBadgeProps) {
  const { label, tone } =
    props.kind === "order"
      ? { label: ORDER_STATUS_LABELS[props.status], tone: ORDER_TONES[props.status] }
      : { label: RESERVATION_STATUS_LABELS[props.status], tone: RESERVATION_TONES[props.status] };

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tone.badge,
        props.className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      <span className="sr-only">Status: </span>
      {label}
    </span>
  );
}
