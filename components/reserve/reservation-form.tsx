"use client";

import { useEffect, useEffectEvent, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { CircleAlert, Info, LoaderCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prefersReducedMotion } from "@/hooks/use-media-query";
import { useRestaurantClock } from "@/hooks/use-restaurant-clock";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateLabel, formatTime } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import type { AvailabilityDTO, ReservationDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { reservationCreateSchema, toFieldErrors } from "@/lib/validation";
import { DateStrip } from "@/components/reserve/date-strip";
import { FieldError, FormField, FormSection } from "@/components/reserve/form-field";
import { ReservationConfirmation } from "@/components/reserve/reservation-confirmation";
import {
  addDays,
  buildDayOptions,
  guestsLabel,
  isDateInRange,
  pickDefaultDate,
  TABLE_HOLD_MINUTES,
} from "@/components/reserve/reserve-utils";
import { TimeSlotGrid, type TimeSlotGridState } from "@/components/reserve/time-slot-grid";

const { minPartySize, maxPartySize, bookingWindowDays, largePartyMessage } = siteConfig.reservations;

const DEFAULT_PARTY_SIZE = Math.min(maxPartySize, Math.max(minPartySize, 2));
/** Wait for the stepper to settle before asking for availability again. */
const PARTY_SIZE_DEBOUNCE_MS = 250;
const NOTES_MAX_LENGTH = 500;

const NO_OCCASION = "none";
const OCCASIONS = ["Birthday", "Anniversary", "Date night", "Business", "Other"] as const;

/** Form order — the first invalid field in this order receives focus. */
const FIELD_ORDER = ["partySize", "date", "time", "name", "email", "phone", "occasion", "notes"] as const;
type FieldKey = (typeof FIELD_ORDER)[number];
type FieldErrors = Partial<Record<FieldKey, string>>;

const controlClass = "h-12 scroll-mt-24 rounded-xl bg-background px-3.5 text-base md:text-base";

interface Notice {
  tone: "error" | "info";
  message: string;
}

interface AvailabilityResult {
  key: string;
  state: TimeSlotGridState;
}

function availabilityKey(date: string, partySize: number, attempt: number): string {
  return `${date}|${partySize}|${attempt}`;
}

/** First message per known field, from either client-side or API field errors. */
function pickFieldErrors(fieldErrors: Record<string, string[]>): FieldErrors {
  const out: FieldErrors = {};
  for (const key of FIELD_ORDER) {
    const message = fieldErrors[key]?.[0];
    if (message) out[key] = message;
  }
  return out;
}

function availabilityErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "We couldn't load times — check your connection and try again.";
    if (error.code === "VALIDATION_ERROR") return error.fieldErrors.date?.[0] ?? error.message;
    if (error.status < 500) return error.message;
  }
  return "We couldn't load available times. Please try again.";
}

/** Party size, date strip, live time slots and contact details → POST /api/reservations. */
export function ReservationForm() {
  const baseId = useId();
  const ids = {
    heading: `${baseId}-heading`,
    partySizeError: `${baseId}-party-size-error`,
    date: `${baseId}-date`,
    dateError: `${baseId}-date-error`,
    timeError: `${baseId}-time-error`,
    name: `${baseId}-name`,
    email: `${baseId}-email`,
    phone: `${baseId}-phone`,
    occasion: `${baseId}-occasion`,
    notes: `${baseId}-notes`,
  };

  const clock = useRestaurantClock();
  const today = clock?.date ?? null;
  const nowTime = clock?.time ?? null;
  const days = useMemo(() => (today ? buildDayOptions(today) : null), [today]);
  const lastBookableDate = today ? addDays(today, bookingWindowDays) : null;
  const defaultDate = days && nowTime ? pickDefaultDate(days, nowTime) : null;

  const [partySize, setPartySize] = useState(DEFAULT_PARTY_SIZE);
  /** Party size used for the availability query; trails `partySize` by the debounce. */
  const [queryPartySize, setQueryPartySize] = useState(DEFAULT_PARTY_SIZE);
  /** A date the guest picked explicitly; until then we follow the sensible default. */
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [occasion, setOccasion] = useState<string>(NO_OCCASION);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ReservationDTO | null>(null);

  const guestsRef = useRef<HTMLDivElement>(null);
  const dateStripRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const date =
    chosenDate && today && lastBookableDate && isDateInRange(chosenDate, today, lastBookableDate)
      ? chosenDate
      : defaultDate;

  // Debounce stepper taps so 2 → 6 makes one availability request, not four.
  useEffect(() => {
    if (partySize === queryPartySize) return;
    const timer = window.setTimeout(() => setQueryPartySize(partySize), PARTY_SIZE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [partySize, queryPartySize]);

  // A picked time that no longer fits (new date, bigger party, someone else booked it) is cleared.
  const onAvailabilityLoaded = useEffectEvent((data: AvailabilityDTO) => {
    if (!time || data.slots.some((slot) => slot.time === time && slot.available)) return;
    setTime(null);
    setNotice({
      tone: "info",
      message: `${formatTime(time)} isn't available for ${guestsLabel(data.partySize)} on ${formatDateLabel(data.date)}. Please pick another time.`,
    });
  });

  useEffect(() => {
    if (!date) return;
    const key = availabilityKey(date, queryPartySize, attempt);
    const controller = new AbortController();
    const params = new URLSearchParams({ date, partySize: String(queryPartySize) });

    apiFetch<AvailabilityDTO>(`/api/reservations/availability?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setAvailability({ key, state: { status: "ready", availability: data } });
        onAvailabilityLoaded(data);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAvailability({ key, state: { status: "error", message: availabilityErrorMessage(error) } });
      });

    return () => controller.abort();
  }, [date, queryPartySize, attempt]);

  const currentKey = date ? availabilityKey(date, queryPartySize, attempt) : null;
  const gridState: TimeSlotGridState =
    currentKey && partySize === queryPartySize && availability?.key === currentKey
      ? availability.state
      : { status: "loading" };

  function clearError(key: FieldKey) {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function focusField(key: FieldKey) {
    let target: HTMLElement | null = null;
    if (key === "partySize") {
      target = guestsRef.current?.querySelector<HTMLElement>("button:not(:disabled)") ?? null;
    } else if (key === "date") {
      target =
        dateStripRef.current?.querySelector<HTMLElement>('button[aria-pressed="true"]') ??
        dateStripRef.current?.querySelector<HTMLElement>("button:not(:disabled)") ??
        document.getElementById(ids.date);
    } else if (key === "time") {
      target = timeRef.current?.querySelector<HTMLElement>("button:not(:disabled)") ?? timeRef.current;
    } else {
      target = document.getElementById(ids[key]);
    }
    if (!target) return;
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
  }

  /** Render the messages first so the focused control is announced with its error. */
  function showErrors(next: FieldErrors) {
    flushSync(() => setErrors(next));
    const first = FIELD_ORDER.find((key) => next[key]);
    if (first) focusField(first);
  }

  function handlePartySizeChange(value: number) {
    setPartySize(value);
    clearError("partySize");
  }

  function handleDateSelect(value: string) {
    setChosenDate(value);
    setNotice(null);
    clearError("date");
  }

  function handleTimeSelect(value: string) {
    setTime(value);
    // Lock the day once a time is picked so the default can't drift underneath it.
    if (date) setChosenDate(date);
    setNotice(null);
    clearError("time");
  }

  function handleSubmitError(error: unknown) {
    if (!(error instanceof ApiError)) {
      toast.error("We couldn't confirm your table", { description: "Something went wrong. Please try again." });
      return;
    }

    switch (error.code) {
      case "SLOT_UNAVAILABLE":
        flushSync(() => {
          setTime(null);
          setNotice({ tone: "error", message: error.message });
          setAttempt((n) => n + 1);
        });
        focusField("time");
        return;
      case "RESTAURANT_CLOSED":
        flushSync(() => {
          setTime(null);
          setAttempt((n) => n + 1);
          setErrors({ date: error.message });
        });
        focusField("date");
        return;
      case "VALIDATION_ERROR": {
        const next = pickFieldErrors(error.fieldErrors);
        if (Object.keys(next).length > 0) {
          showErrors(next);
        } else {
          toast.error("Please check your booking", { description: error.message });
        }
        return;
      }
      default:
        if (error.status === 0) {
          toast.error("You appear to be offline", { description: error.message });
        } else {
          toast.error("We couldn't confirm your table", {
            description: `${error.message} If it keeps happening, call us on ${siteConfig.phone}.`,
          });
        }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsed = reservationCreateSchema.safeParse({
      date: date ?? "",
      time: time ?? "",
      partySize,
      name,
      email,
      phone,
      occasion: occasion === NO_OCCASION ? undefined : occasion,
      notes,
    });

    if (!parsed.success) {
      const next = pickFieldErrors(toFieldErrors(parsed.error));
      if (!date) next.date = "Choose a date.";
      if (!time) next.time = date ? "Choose a time." : "Choose a date, then a time.";
      showErrors(next);
      return;
    }

    setErrors({});
    setNotice(null);
    setSubmitting(true);
    try {
      const reservation = await apiFetch<ReservationDTO>("/api/reservations", {
        method: "POST",
        json: parsed.data,
      });
      setConfirmed(reservation);
    } catch (error) {
      handleSubmitError(error);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    // Keep the guest's contact details for convenience; clear the booking-specific choices.
    flushSync(() => {
      setConfirmed(null);
      setTime(null);
      setOccasion(NO_OCCASION);
      setNotes("");
      setNotice(null);
      setErrors({});
      setAttempt((n) => n + 1);
    });
    headingRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }

  const summary =
    date && time ? `${guestsLabel(partySize)} · ${formatDateLabel(date)} · ${formatTime(time)}` : null;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
      {confirmed ? (
        <ReservationConfirmation reservation={confirmed} onReset={handleReset} />
      ) : (
        <form noValidate onSubmit={handleSubmit} aria-labelledby={ids.heading} aria-busy={submitting || undefined}>
          <div className="mb-6">
            <h2
              ref={headingRef}
              id={ids.heading}
              tabIndex={-1}
              className="scroll-mt-24 text-2xl font-black tracking-tight text-charcoal focus:outline-none sm:text-3xl"
            >
              Reserve your table
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Takes about a minute. No card needed.</p>
          </div>

          <div className="space-y-8">
            <FormSection
              step={1}
              title="Guests"
              describedBy={errors.partySize ? ids.partySizeError : undefined}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold">{guestsLabel(partySize)}</p>
                  <p className="text-sm text-muted-foreground">
                    Online bookings for {minPartySize}–{maxPartySize} guests
                  </p>
                </div>
                <div ref={guestsRef} className="shrink-0">
                  <QuantityStepper
                    value={partySize}
                    onChange={handlePartySizeChange}
                    min={minPartySize}
                    max={maxPartySize}
                    label="guests"
                  />
                </div>
              </div>
              <div
                className={cn(
                  "mt-4 flex flex-wrap items-center gap-x-3 rounded-2xl border px-4 py-1 text-sm transition-colors",
                  partySize >= maxPartySize
                    ? "border-ember/30 bg-accent text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                <p className="py-1.5">{largePartyMessage}</p>
                <a
                  href={siteConfig.phoneHref}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full font-semibold text-foreground underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {siteConfig.phone}
                </a>
              </div>
              {errors.partySize ? (
                <FieldError id={ids.partySizeError} className="mt-2">
                  {errors.partySize}
                </FieldError>
              ) : null}
            </FormSection>

            <FormSection step={2} title="Date" describedBy={errors.date ? ids.dateError : undefined}>
              <DateStrip
                ref={dateStripRef}
                days={days}
                selected={date}
                onSelect={handleDateSelect}
                minDate={today}
                maxDate={lastBookableDate}
                inputId={ids.date}
                errorId={ids.dateError}
                invalid={Boolean(errors.date)}
              />
              {errors.date ? (
                <FieldError id={ids.dateError} className="mt-3">
                  {errors.date}
                </FieldError>
              ) : null}
            </FormSection>

            <FormSection
              step={3}
              title="Time"
              description={`Times are local to ${siteConfig.address.city}.`}
              describedBy={errors.time ? ids.timeError : undefined}
            >
              <div ref={timeRef} tabIndex={-1} className="scroll-mt-24 focus:outline-none">
                <div aria-live="polite" aria-atomic="true">
                  {notice ? (
                    <div
                      className={cn(
                        "mb-3 flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm",
                        notice.tone === "error"
                          ? "border-destructive/30 bg-destructive/5 text-destructive"
                          : "border-ember/30 bg-accent text-foreground",
                      )}
                    >
                      {notice.tone === "error" ? (
                        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <Info className="mt-0.5 size-4 shrink-0 text-ember-dark" aria-hidden="true" />
                      )}
                      <p className="font-medium">{notice.message}</p>
                    </div>
                  ) : null}
                </div>

                {date || !clock ? (
                  <TimeSlotGrid
                    state={gridState}
                    selected={time}
                    onSelect={handleTimeSelect}
                    onRetry={() => setAttempt((n) => n + 1)}
                    errorId={ids.timeError}
                    invalid={Boolean(errors.time)}
                  />
                ) : (
                  <p className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Choose a date above to see available times.
                  </p>
                )}

                {errors.time ? (
                  <FieldError id={ids.timeError} className="mt-3">
                    {errors.time}
                  </FieldError>
                ) : null}
              </div>
            </FormSection>

            <FormSection step={4} title="Your details">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id={ids.name} label="Full name" error={errors.name} className="sm:col-span-2">
                  {(control) => (
                    <Input
                      {...control}
                      name="name"
                      type="text"
                      autoComplete="name"
                      autoCapitalize="words"
                      aria-required="true"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        clearError("name");
                      }}
                      className={controlClass}
                    />
                  )}
                </FormField>

                <FormField id={ids.email} label="Email" error={errors.email}>
                  {(control) => (
                    <Input
                      {...control}
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-required="true"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        clearError("email");
                      }}
                      className={controlClass}
                    />
                  )}
                </FormField>

                <FormField
                  id={ids.phone}
                  label="Phone"
                  error={errors.phone}
                  hint="Only used if we need to reach you about this booking."
                >
                  {(control) => (
                    <Input
                      {...control}
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      aria-required="true"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value);
                        clearError("phone");
                      }}
                      className={controlClass}
                    />
                  )}
                </FormField>

                <FormField id={ids.occasion} label="Occasion" optional error={errors.occasion} className="sm:col-span-2">
                  {(control) => (
                    <Select
                      value={occasion}
                      onValueChange={(value) => {
                        setOccasion(value);
                        clearError("occasion");
                      }}
                    >
                      <SelectTrigger {...control} className="w-full scroll-mt-24 rounded-xl bg-background px-3.5 text-base data-[size=default]:h-12 sm:max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_OCCASION} className="min-h-11 text-base">
                          None
                        </SelectItem>
                        {OCCASIONS.map((option) => (
                          <SelectItem key={option} value={option} className="min-h-11 text-base">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>

                <FormField
                  id={ids.notes}
                  label="Notes"
                  optional
                  error={errors.notes}
                  className="sm:col-span-2"
                  hint={
                    <span className="flex justify-between gap-3">
                      <span>Anything the team should know before you arrive.</span>
                      <span className="shrink-0 tabular-nums">
                        <span aria-hidden="true">
                          {notes.length}/{NOTES_MAX_LENGTH}
                        </span>
                        <span className="sr-only">
                          {notes.length} of {NOTES_MAX_LENGTH} characters used
                        </span>
                      </span>
                    </span>
                  }
                >
                  {(control) => (
                    <Textarea
                      {...control}
                      name="notes"
                      rows={3}
                      maxLength={NOTES_MAX_LENGTH}
                      placeholder="Allergies, high chair, accessibility needs…"
                      value={notes}
                      onChange={(event) => {
                        setNotes(event.target.value.slice(0, NOTES_MAX_LENGTH));
                        clearError("notes");
                      }}
                      className="min-h-24 scroll-mt-24 rounded-xl bg-background px-3.5 py-3 text-base md:text-base"
                    />
                  )}
                </FormField>
              </div>
            </FormSection>

            <div className="border-t border-border pt-6">
              <p className="mb-3 min-h-5 text-sm text-muted-foreground">
                {summary ? (
                  <>
                    <span className="sr-only">Your booking: </span>
                    <span className="font-semibold text-foreground">{summary}</span>
                  </>
                ) : (
                  "Pick a date and time to continue."
                )}
              </p>
              {/* aria-disabled keeps focus on the button while the request is in flight. */}
              <Button
                type="submit"
                aria-disabled={submitting || undefined}
                className="h-12 w-full rounded-full px-6 text-base aria-disabled:cursor-progress aria-disabled:opacity-80"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Confirming…
                  </>
                ) : (
                  "Confirm reservation"
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-pretty text-muted-foreground">
                We hold tables for {TABLE_HOLD_MINUTES} minutes. To change or cancel, call{" "}
                <a
                  href={siteConfig.phoneHref}
                  className="font-semibold whitespace-nowrap text-foreground underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {siteConfig.phone}
                </a>
                .
              </p>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
