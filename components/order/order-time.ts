import { formatDateLabel, formatTime, restaurantNow } from "@/lib/format";

// Every order time is shown on the restaurant's wall clock (siteConfig.timeZone), not the viewer's.
// Going through restaurantNow + formatTime keeps server and client output byte-identical
// (Intl's own time formatting varies between ICU versions, e.g. narrow no-break spaces before "PM").

/** Restaurant-local { date: "YYYY-MM-DD", time: "HH:mm" } for an ISO instant. */
export function restaurantWallClock(iso: string): { date: string; time: string } {
  const { date, time } = restaurantNow(new Date(iso));
  return { date, time };
}

/** ISO instant → "7:02 PM" in the restaurant's time zone. */
export function formatOrderTime(iso: string): string {
  return formatTime(restaurantWallClock(iso).time);
}

/** ISO instant → "Monday, September 14" in the restaurant's time zone. */
export function formatOrderDate(iso: string): string {
  return formatDateLabel(restaurantWallClock(iso).date);
}
