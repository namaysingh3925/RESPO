/**
 * Unit tests for the restaurant time helpers. Run with `npm run test:unit`
 * (Node's built-in test runner via tsx — no extra dependencies).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  daysBetween,
  isValidIsoDate,
  restaurantDayUtcRange,
  timeZoneOffsetMinutes,
  toZonedDateTime,
  weekdayOf,
  zonedTimeToUtc,
} from "./time";

const NY = "America/New_York";
const iso = (d: Date) => d.toISOString();

describe("calendar helpers", () => {
  it("validates real calendar dates", () => {
    assert.equal(isValidIsoDate("2026-09-18"), true);
    assert.equal(isValidIsoDate("2028-02-29"), true);
    assert.equal(isValidIsoDate("2026-02-29"), false);
    assert.equal(isValidIsoDate("2026-13-01"), false);
    assert.equal(isValidIsoDate("2026-9-18"), false);
  });

  it("adds days across month and year boundaries", () => {
    assert.equal(addDays("2026-01-31", 1), "2026-02-01");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
    assert.equal(addDays("2026-03-07", 2), "2026-03-09");
  });

  it("counts days between dates", () => {
    assert.equal(daysBetween("2026-09-14", "2026-11-13"), 60);
    assert.equal(daysBetween("2026-09-14", "2026-09-13"), -1);
    assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
  });

  it("returns the weekday of a calendar date (0 = Sunday)", () => {
    assert.equal(weekdayOf("2026-09-13"), 0);
    assert.equal(weekdayOf("2026-09-18"), 5);
  });
});

describe("zonedTimeToUtc", () => {
  it("converts standard and daylight time in New York", () => {
    assert.equal(iso(zonedTimeToUtc("2026-01-15", "19:30", NY)), "2026-01-16T00:30:00.000Z");
    assert.equal(iso(zonedTimeToUtc("2026-07-04", "12:00", NY)), "2026-07-04T16:00:00.000Z");
  });

  it("handles the spring-forward day, including the skipped hour", () => {
    assert.equal(iso(zonedTimeToUtc("2026-03-08", "01:30", NY)), "2026-03-08T06:30:00.000Z");
    assert.equal(iso(zonedTimeToUtc("2026-03-08", "03:30", NY)), "2026-03-08T07:30:00.000Z");
    assert.equal(iso(zonedTimeToUtc("2026-03-08", "12:00", NY)), "2026-03-08T16:00:00.000Z");
    // 02:30 does not exist; it shifts forward to 03:30 EDT.
    assert.equal(iso(zonedTimeToUtc("2026-03-08", "02:30", NY)), "2026-03-08T07:30:00.000Z");
  });

  it("handles the fall-back day, resolving the repeated hour to the earlier instant", () => {
    assert.equal(iso(zonedTimeToUtc("2026-11-01", "01:30", NY)), "2026-11-01T05:30:00.000Z");
    assert.equal(iso(zonedTimeToUtc("2026-11-01", "00:30", NY)), "2026-11-01T04:30:00.000Z");
    assert.equal(iso(zonedTimeToUtc("2026-11-01", "12:00", NY)), "2026-11-01T17:00:00.000Z");
  });

  it("works for zones east of UTC and half-hour offsets", () => {
    assert.equal(iso(zonedTimeToUtc("2026-03-29", "01:30", "Europe/London")), "2026-03-29T01:30:00.000Z");
    assert.equal(iso(zonedTimeToUtc("2026-10-25", "01:30", "Europe/London")), "2026-10-25T00:30:00.000Z");
    assert.equal(iso(zonedTimeToUtc("2026-09-14", "00:00", "Asia/Kolkata")), "2026-09-13T18:30:00.000Z");
  });

  it("round-trips with toZonedDateTime", () => {
    for (const [date, time] of [
      ["2026-09-18", "19:30"],
      ["2026-12-31", "23:59"],
      ["2026-03-08", "03:00"],
      ["2026-11-01", "01:59"],
    ]) {
      assert.deepEqual(toZonedDateTime(zonedTimeToUtc(date, time, NY), NY), { date, time });
    }
  });

  it("rejects invalid input", () => {
    assert.throws(() => zonedTimeToUtc("2026-02-30", "12:00", NY), RangeError);
    assert.throws(() => zonedTimeToUtc("2026-02-10", "24:00", NY), RangeError);
  });
});

describe("offsets and day ranges", () => {
  it("reads UTC offsets from Intl", () => {
    assert.equal(timeZoneOffsetMinutes(new Date("2026-01-15T12:00:00Z"), NY), -300);
    assert.equal(timeZoneOffsetMinutes(new Date("2026-07-15T12:00:00Z"), NY), -240);
    assert.equal(timeZoneOffsetMinutes(new Date("2026-07-15T12:00:00Z"), "Asia/Kolkata"), 330);
  });

  it("bounds a restaurant-local day, including 23h and 25h DST days", () => {
    const normal = restaurantDayUtcRange("2026-09-18", NY);
    assert.equal(iso(normal.start), "2026-09-18T04:00:00.000Z");
    assert.equal(iso(normal.end), "2026-09-19T04:00:00.000Z");

    const spring = restaurantDayUtcRange("2026-03-08", NY);
    assert.equal(spring.end.getTime() - spring.start.getTime(), 23 * 3_600_000);

    const fall = restaurantDayUtcRange("2026-11-01", NY);
    assert.equal(fall.end.getTime() - fall.start.getTime(), 25 * 3_600_000);
  });
});
