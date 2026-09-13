import { formatTime, toMinutes } from "@/lib/format";
import { siteConfig, type OpeningHours } from "@/lib/site-config";

/** Weekly hours in display order (Monday first, as defined in site-config). */
export const WEEKLY_HOURS: readonly OpeningHours[] = siteConfig.hours;

/** How many minutes before close the status flips to "Closing soon". */
const CLOSING_SOON_MINUTES = 45;

export function hoursForDay(weekday: number): OpeningHours | undefined {
  return WEEKLY_HOURS.find((h) => h.day === weekday);
}

/** "11:30 AM – 10:00 PM", or "Closed". */
export function formatHoursRange(hours: Pick<OpeningHours, "open" | "close"> | undefined): string {
  if (!hours?.open || !hours.close) return "Closed";
  return `${formatTime(hours.open)} – ${formatTime(hours.close)}`;
}

export interface HoursGroup {
  /** "Mon – Thu", "Fri", … */
  days: string;
  /** Full label for screen readers, "Monday to Thursday". */
  daysLong: string;
  hours: string;
}

/** Collapses consecutive days that share the same hours: Mon – Thu · 11:30 AM – 10:00 PM. */
export function groupWeeklyHours(): HoursGroup[] {
  const groups: Array<{ first: OpeningHours; last: OpeningHours; hours: string }> = [];
  for (const day of WEEKLY_HOURS) {
    const hours = formatHoursRange(day);
    const previous = groups.at(-1);
    if (previous && previous.hours === hours) {
      previous.last = day;
    } else {
      groups.push({ first: day, last: day, hours });
    }
  }
  return groups.map(({ first, last, hours }) => {
    const same = first.day === last.day;
    return {
      days: same ? first.label.slice(0, 3) : `${first.label.slice(0, 3)} – ${last.label.slice(0, 3)}`,
      daysLong: same ? first.label : `${first.label} to ${last.label}`,
      hours,
    };
  });
}

export type OpenState = "open" | "closing-soon" | "closed";

export interface OpenStatus {
  state: OpenState;
  /** "Open now · until 10:00 PM" / "Closed · opens 11:30 AM tomorrow" */
  label: string;
}

/** Open/closed status for a restaurant-local wall-clock time (see restaurantNow). */
export function getOpenStatus(now: { time: string; weekday: number }): OpenStatus {
  const minutes = toMinutes(now.time);
  const today = hoursForDay(now.weekday);

  if (today?.open && today.close) {
    const opens = toMinutes(today.open);
    let closes = toMinutes(today.close);
    if (closes <= opens) closes += 24 * 60; // closes after midnight

    if (minutes >= opens && minutes < closes) {
      const closingSoon = closes - minutes <= CLOSING_SOON_MINUTES;
      return {
        state: closingSoon ? "closing-soon" : "open",
        label: `${closingSoon ? "Closing soon" : "Open now"} · until ${formatTime(today.close)}`,
      };
    }
    if (minutes < opens) {
      return { state: "closed", label: `Closed · opens ${formatTime(today.open)} today` };
    }
  }

  for (let offset = 1; offset <= 7; offset++) {
    const next = hoursForDay((now.weekday + offset) % 7);
    if (next?.open) {
      const when = offset === 1 ? "tomorrow" : next.label;
      return { state: "closed", label: `Closed · opens ${formatTime(next.open)} ${when}` };
    }
  }

  return { state: "closed", label: "Closed" };
}

/** True when `pathname` is `href` or a child route of it. */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
