/**
 * Minimal RFC 5545 calendar file for a confirmed reservation.
 * Times are floating wall-clock values anchored to the restaurant's IANA zone via TZID.
 */
import { formatTime } from "@/lib/format";
import { fullAddress, siteConfig } from "@/lib/site-config";
import type { ReservationDTO } from "@/lib/types";
import { guestsLabel, isLunchSlot, TABLE_HOLD_MINUTES } from "@/components/reserve/reserve-utils";

const CRLF = "\r\n";
const DURATION_MINUTES = 120;

/** VTIMEZONE for America/New_York (US DST rules since 2007). Other zones rely on the client resolving the TZID. */
const NEW_YORK_VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "X-LIC-LOCATION:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Escape a TEXT value (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fold content lines longer than 75 octets (RFC 5545 §3.1) without splitting multi-byte characters. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts toward their 75-octet limit.
    const limit = chunks.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      chunks.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  chunks.push(current);
  return chunks.join(`${CRLF} `);
}

/** Local wall-clock "YYYY-MM-DD" + "HH:mm" (+ minutes) → "YYYYMMDDTHHMMSS". */
function toLocalStamp(isoDate: string, hhmm: string, addMinutes = 0): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const wall = new Date(Date.UTC(y, mo - 1, d, h, mi + addMinutes));
  return wall.toISOString().slice(0, 19).replace(/[-:]/g, "");
}

function toUtcStamp(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

function siteHost(): string {
  try {
    return new URL(siteConfig.url).hostname || "emberhouse";
  } catch {
    return "emberhouse";
  }
}

export function buildReservationIcs(reservation: ReservationDTO, now: Date = new Date()): string {
  const { code, date, time, partySize, occasion } = reservation;
  const tz = siteConfig.timeZone;
  const meal = isLunchSlot(time) ? "Lunch" : "Dinner";
  const description = [
    `Table for ${guestsLabel(partySize)} at ${formatTime(time)}.`,
    occasion ? `Occasion: ${occasion}.` : null,
    `Confirmation code: ${code}`,
    "",
    `We hold tables for ${TABLE_HOLD_MINUTES} minutes. To change or cancel, call ${siteConfig.phone}.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeIcsText(siteConfig.name)}//Reservations//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(tz === "America/New_York" ? NEW_YORK_VTIMEZONE : []),
    "BEGIN:VEVENT",
    `UID:${code.toLowerCase()}@${siteHost()}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART;TZID=${tz}:${toLocalStamp(date, time)}`,
    `DTEND;TZID=${tz}:${toLocalStamp(date, time, DURATION_MINUTES)}`,
    `SUMMARY:${escapeIcsText(`${meal} at ${siteConfig.name}`)}`,
    `LOCATION:${escapeIcsText(`${siteConfig.name}, ${fullAddress}`)}`,
    `GEO:${siteConfig.geo.lat};${siteConfig.geo.lng}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(`${meal} at ${siteConfig.name} in 2 hours`)}`,
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}

/** Triggers a download of the reservation as an .ics file. Browser-only. */
export function downloadReservationIcs(reservation: ReservationDTO): void {
  const blob = new Blob([buildReservationIcs(reservation)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${siteConfig.name.toLowerCase().replace(/\s+/g, "-")}-${reservation.code}.ics`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
