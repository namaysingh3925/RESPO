"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bike,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Clock,
  CreditCard,
  Loader2,
  ShoppingBag,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useCartHydrated } from "@/components/cart/use-cart-hydrated";
import {
  CheckoutSection,
  FieldError,
  FieldHint,
  TextAreaField,
  TextField,
  describedBy,
  fieldId,
} from "@/components/order/checkout-fields";
import { ChoiceCard } from "@/components/order/choice-card";
import { DeliveryThreshold } from "@/components/order/delivery-threshold";
import { OrderSummary, type OrderSummaryLine } from "@/components/order/order-summary";
import { getKitchenStatus, getScheduleSlots } from "@/components/order/schedule";
import { TipSelector } from "@/components/order/tip-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { prefersReducedMotion, useMediaQuery } from "@/hooks/use-media-query";
import { useRestaurantClock } from "@/hooks/use-restaurant-clock";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { FulfillmentType } from "@/lib/constants";
import { formatPrice, formatTime } from "@/lib/format";
import { calculateTotals, tipFromRate } from "@/lib/pricing";
import { fullAddress, siteConfig } from "@/lib/site-config";
import { selectItemCount, selectSubtotalCents, useCart } from "@/lib/store/cart";
import type { OrderDTO } from "@/lib/types";
import {
  orderCreateSchema,
  toFieldErrors,
  type OrderCreateFormValues,
  type OrderCreateInput,
} from "@/lib/validation";
import { cn } from "@/lib/utils";

const {
  pickupLeadMinutes,
  deliveryLeadMinutes,
  deliveryRadiusKm,
  minimumDeliverySubtotalCents,
  tipPresets,
} = siteConfig.ordering;

const NOTES_MAX = 500;
const INSTRUCTIONS_MAX = 200;
const DEFAULT_TIP_RATE: number = tipPresets.find((rate) => rate === 0.15) ?? tipPresets[0];

/** Inline-error keys in on-screen order. The first one with an error receives focus. */
const FIELD_ORDER = [
  "requestedTime",
  "deliveryAddress.line1",
  "deliveryAddress.line2",
  "deliveryAddress.city",
  "deliveryAddress.postalCode",
  "deliveryAddress.instructions",
  "customerName",
  "email",
  "phone",
  "notes",
] as const;

type FieldKey = (typeof FIELD_ORDER)[number];
type FieldErrors = Partial<Record<FieldKey, string>>;
type Timing = "ASAP" | "SCHEDULED";
type AddressKey = "line1" | "line2" | "city" | "postalCode" | "instructions";
type ContactKey = "customerName" | "email" | "phone";

interface FormAlert {
  title: string;
  message: string;
  action?: "edit-cart";
}

function isFieldKey(key: string): key is FieldKey {
  return (FIELD_ORDER as readonly string[]).includes(key);
}

/** Splits `{ path: messages[] }` into first messages for known inputs and everything else (shown in an alert). */
function splitErrors(raw: Record<string, string[]>): { fields: FieldErrors; other: string[] } {
  const fields: FieldErrors = {};
  const other: string[] = [];
  for (const [key, messages] of Object.entries(raw)) {
    const message = messages[0];
    if (!message) continue;
    if (isFieldKey(key)) fields[key] ??= message;
    else other.push(message);
  }
  return { fields, other };
}

/** "~20 min" visually, "about 20 min" for screen readers. */
function Approx({ minutes }: { minutes: number }) {
  return (
    <>
      <span aria-hidden="true">~</span>
      <span className="sr-only">about </span>
      {minutes} min
    </>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const lines = useCart((state) => state.lines);
  const itemCount = useCart(selectItemCount);
  const subtotalCents = useCart(selectSubtotalCents);
  const setCartOpen = useCart((state) => state.setOpen);
  const clock = useRestaurantClock();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const summaryHeadingId = useId();
  const summaryPanelId = useId();

  const [fulfillment, setFulfillment] = useState<FulfillmentType>("PICKUP");
  const [timingChoice, setTimingChoice] = useState<Timing | null>(null);
  const [timeChoice, setTimeChoice] = useState("");
  const [address, setAddress] = useState<Record<AddressKey, string>>({
    line1: "",
    line2: "",
    city: siteConfig.address.city,
    postalCode: "",
    instructions: "",
  });
  const [contact, setContact] = useState<Record<ContactKey, string>>({ customerName: "", email: "", phone: "" });
  const [tipRate, setTipRate] = useState(DEFAULT_TIP_RATE);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formAlert, setFormAlert] = useState<FormAlert | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placedCode, setPlacedCode] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const isDelivery = fulfillment === "DELIVERY";
  const leadMinutes = isDelivery ? deliveryLeadMinutes : pickupLeadMinutes;
  const slots = useMemo(() => (clock ? getScheduleSlots(clock, leadMinutes) : []), [clock, leadMinutes]);
  const kitchen = clock ? getKitchenStatus(clock) : null;
  const canSchedule = slots.length > 0;
  // Until the customer picks, default to scheduling when the kitchen is closed but later slots exist.
  const timing: Timing = canSchedule ? (timingChoice ?? (kitchen && !kitchen.isOpen ? "SCHEDULED" : "ASAP")) : "ASAP";
  // A chosen slot silently drops out once it's too soon (clock ticks) or the lead time changes.
  const requestedTime = timing === "SCHEDULED" && slots.includes(timeChoice) ? timeChoice : "";

  const tipCents = tipFromRate(subtotalCents, tipRate);
  const totals = calculateTotals({ subtotalCents, fulfillment, tipCents });
  const summaryLines: OrderSummaryLine[] = lines.map((line) => ({
    id: line.slug,
    name: line.name,
    quantity: line.quantity,
    lineTotalCents: line.priceCents * line.quantity,
    notes: line.notes,
  }));

  // ---------- State helpers ----------

  const clearError = (key: FieldKey) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const updateAddress = (key: AddressKey, value: string) => {
    setAddress((prev) => ({ ...prev, [key]: value }));
    clearError(`deliveryAddress.${key}`);
  };

  const updateContact = (key: ContactKey, value: string) => {
    setContact((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  function showFieldErrors(next: FieldErrors) {
    const count = Object.keys(next).length;
    flushSync(() => {
      setErrors(next);
      setStatusMessage(
        count > 0 ? `${count} ${count === 1 ? "field needs" : "fields need"} your attention before we can place the order.` : "",
      );
    });
    const first = FIELD_ORDER.find((key) => next[key]);
    const element = first ? document.getElementById(fieldId(first)) : null;
    if (element) {
      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }

  // ---------- Submit ----------

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormAlert(null);

    const payload: OrderCreateFormValues = {
      fulfillment,
      items: lines.map((line) => ({ slug: line.slug, quantity: line.quantity, notes: line.notes })),
      customerName: contact.customerName,
      email: contact.email.trim(),
      phone: contact.phone,
      deliveryAddress: isDelivery ? { ...address } : undefined,
      requestedTime: timing === "SCHEDULED" ? requestedTime || null : null,
      tipCents,
      paymentMethod: "PAY_IN_PERSON",
      notes,
    };

    const parsed = orderCreateSchema.safeParse(payload);
    const { fields, other } = parsed.success
      ? { fields: {} as FieldErrors, other: [] as string[] }
      : splitErrors(toFieldErrors(parsed.error));
    if (timing === "SCHEDULED" && !requestedTime) {
      fields.requestedTime = `Choose a ${isDelivery ? "delivery" : "pickup"} time`;
    }

    if (!parsed.success || Object.keys(fields).length > 0) {
      if (other.length > 0) setFormAlert({ title: "Please check your order", message: other[0] });
      showFieldErrors(fields);
      return;
    }

    if (isDelivery && subtotalCents < minimumDeliverySubtotalCents) {
      setErrors({});
      setFormAlert({
        title: "Delivery minimum not met",
        message: `Delivery orders start at ${formatPrice(minimumDeliverySubtotalCents)}. Add ${formatPrice(
          minimumDeliverySubtotalCents - subtotalCents,
        )} more or switch to pickup.`,
      });
      return;
    }

    setErrors({});
    void placeOrder(parsed.data);
  }

  async function placeOrder(input: OrderCreateInput) {
    setSubmitting(true);
    setStatusMessage("Placing your order…");
    try {
      const order = await apiFetch<OrderDTO>("/api/orders", { method: "POST", json: input });
      setPlacedCode(order.code);
      setStatusMessage(`Order ${order.code} placed. Opening your order tracker.`);
      useCart.getState().clear();
      toast.success(`Order ${order.code} placed`, {
        description: "Follow along here as the kitchen gets cooking.",
      });
      router.push(`/order/${encodeURIComponent(order.code)}`);
    } catch (error) {
      setSubmitting(false);
      setStatusMessage("");
      handleOrderError(error);
    }
  }

  function handleOrderError(error: unknown) {
    if (!(error instanceof ApiError)) {
      toast.error("Something went wrong placing your order. Please try again.");
      return;
    }
    switch (error.code) {
      case "VALIDATION_ERROR": {
        const { fields, other } = splitErrors(error.fieldErrors);
        const hasFields = Object.keys(fields).length > 0;
        if (other.length > 0 || !hasFields) {
          setFormAlert({ title: "Please check your order", message: other[0] ?? error.message });
        }
        if (hasFields) showFieldErrors(fields);
        return;
      }
      case "ITEM_UNAVAILABLE":
        setFormAlert({ title: "Something in your cart is unavailable", message: error.message, action: "edit-cart" });
        return;
      case "MINIMUM_NOT_MET":
        setFormAlert({ title: "Delivery minimum not met", message: error.message });
        return;
      case "RESTAURANT_CLOSED":
        setFormAlert({ title: "We can't take this order right now", message: error.message });
        return;
      default:
        // Network failures (status 0), rate limits and server errors are transient: retrying is the fix.
        toast.error(error.message);
    }
  }

  // ---------- Render ----------

  if (placedCode) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <Loader2 className="size-8 animate-spin text-ember motion-reduce:animate-none" aria-hidden="true" />
        <p role="status" className="mt-4 text-lg font-bold">
          Order {placedCode} placed
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Taking you to your order tracker…</p>
        <Link
          href={`/order/${encodeURIComponent(placedCode)}`}
          className="mt-4 inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Go to your order
        </Link>
      </div>
    );
  }

  if (!hydrated) return <CheckoutSkeleton />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-ember/10 text-ember">
          <ShoppingBag className="size-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold">Your cart is empty</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Pick a few favorites from the menu (smash burgers, wood-fired pizza, late-night desserts), then come back
          here to check out.
        </p>
        <Button asChild className="mt-6 h-12 rounded-full px-6 text-base">
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </div>
    );
  }

  const step = { fulfillment: 1, timing: 2, address: 3, contact: isDelivery ? 4 : 3 };
  const tipStep = step.contact + 1;
  const notesStep = tipStep + 1;
  const paymentStep = notesStep + 1;

  const asapDescription =
    kitchen && !kitchen.isOpen
      ? `The kitchen is closed${kitchen.nextOpening ? `. We open ${kitchen.nextOpening}` : ""}.`
      : isDelivery
        ? `Arrives in about ${deliveryLeadMinutes} minutes`
        : `Ready in about ${pickupLeadMinutes} minutes`;

  const scheduleDescription = !clock
    ? "Checking today's times…"
    : canSchedule
      ? `Choose a time between ${formatTime(slots[0])} and ${formatTime(slots[slots.length - 1])}`
      : "Scheduling is unavailable right now — ASAP only";

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Checkout"
      className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <p role="status" className="sr-only">
        {statusMessage}
      </p>

      <div className="min-w-0 space-y-5">
        {/* 1. Fulfillment */}
        <CheckoutSection step={step.fulfillment} title="Pickup or delivery?">
          <RadioGroup
            value={fulfillment}
            onValueChange={(value) => {
              if (value !== "PICKUP" && value !== "DELIVERY") return;
              setFulfillment(value);
              setFormAlert(null);
            }}
            aria-label="Pickup or delivery"
            className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2"
          >
            <ChoiceCard
              id={fieldId("fulfillment-pickup")}
              value="PICKUP"
              icon={ShoppingBag}
              title="Pickup"
              meta={<Approx minutes={pickupLeadMinutes} />}
              description={fullAddress}
            />
            <ChoiceCard
              id={fieldId("fulfillment-delivery")}
              value="DELIVERY"
              icon={Bike}
              title="Delivery"
              meta={<Approx minutes={deliveryLeadMinutes} />}
              description={`Within ${deliveryRadiusKm} km of the restaurant`}
            />
          </RadioGroup>
        </CheckoutSection>

        {/* 2. Timing */}
        <CheckoutSection step={step.timing} title="When do you want it?">
          <RadioGroup
            value={timing}
            onValueChange={(value) => {
              if (value !== "ASAP" && value !== "SCHEDULED") return;
              setTimingChoice(value);
              clearError("requestedTime");
            }}
            aria-label="Order timing"
            className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2"
          >
            <ChoiceCard
              id={fieldId("timing-asap")}
              value="ASAP"
              icon={Zap}
              title="As soon as possible"
              description={asapDescription}
            />
            <ChoiceCard
              id={fieldId("timing-scheduled")}
              value="SCHEDULED"
              icon={CalendarClock}
              title="Schedule for later today"
              description={scheduleDescription}
              disabled={!canSchedule}
            />
          </RadioGroup>

          {timing === "SCHEDULED" && (
            <div className="space-y-1.5">
              <Label htmlFor={fieldId("requestedTime")} className="text-sm font-semibold">
                {isDelivery ? "Delivery time" : "Pickup time"}
              </Label>
              <Select
                value={requestedTime}
                onValueChange={(value) => {
                  setTimeChoice(value);
                  clearError("requestedTime");
                }}
              >
                <SelectTrigger
                  id={fieldId("requestedTime")}
                  aria-invalid={errors.requestedTime ? true : undefined}
                  aria-describedby={describedBy("requestedTime", { hint: true, error: Boolean(errors.requestedTime) })}
                  className="h-12 w-full rounded-xl bg-background px-3.5 text-base data-[size=default]:h-12"
                >
                  <SelectValue placeholder="Choose a time" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {slots.map((slot) => (
                    <SelectItem key={slot} value={slot} className="min-h-11 text-base">
                      {formatTime(slot)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHint name="requestedTime">
                {isDelivery
                  ? `We need about ${deliveryLeadMinutes} minutes to cook and deliver.`
                  : `We need about ${pickupLeadMinutes} minutes to get it ready.`}
              </FieldHint>
              <FieldError name="requestedTime" message={errors.requestedTime} />
            </div>
          )}

          {kitchen && !kitchen.isOpen && (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-4 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p>
                <span className="font-semibold">The kitchen is closed right now.</span>{" "}
                {kitchen.nextOpening && <>We open {kitchen.nextOpening}. </>}
                {canSchedule
                  ? "Schedule your order for later today and we'll have it ready."
                  : "We'd love to cook for you then."}
              </p>
            </div>
          )}
          {kitchen?.isOpen && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-full bg-emerald-500" />
              Kitchen open until {kitchen.closesAt} today
            </p>
          )}
        </CheckoutSection>

        {/* 3. Delivery address */}
        {isDelivery && (
          <CheckoutSection
            step={step.address}
            title="Where are we delivering?"
            description={`We deliver within ${deliveryRadiusKm} km of ${siteConfig.address.street}, ${siteConfig.address.city}.`}
          >
            <DeliveryThreshold subtotalCents={subtotalCents} />
            <TextField
              name="deliveryAddress.line1"
              label="Street address"
              value={address.line1}
              onValueChange={(value) => updateAddress("line1", value)}
              error={errors["deliveryAddress.line1"]}
              autoComplete="shipping address-line1"
              enterKeyHint="next"
            />
            <TextField
              name="deliveryAddress.line2"
              label="Apt, suite or floor"
              optional
              value={address.line2}
              onValueChange={(value) => updateAddress("line2", value)}
              error={errors["deliveryAddress.line2"]}
              autoComplete="shipping address-line2"
              enterKeyHint="next"
            />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <TextField
                name="deliveryAddress.city"
                label="City"
                value={address.city}
                onValueChange={(value) => updateAddress("city", value)}
                error={errors["deliveryAddress.city"]}
                autoComplete="shipping address-level2"
                enterKeyHint="next"
              />
              <TextField
                name="deliveryAddress.postalCode"
                label="PIN code"
                value={address.postalCode}
                onValueChange={(value) => updateAddress("postalCode", value)}
                error={errors["deliveryAddress.postalCode"]}
                autoComplete="shipping postal-code"
                inputMode="numeric"
                maxLength={10}
                enterKeyHint="next"
              />
            </div>
            <TextAreaField
              name="deliveryAddress.instructions"
              label="Delivery instructions"
              optional
              value={address.instructions}
              onValueChange={(value) => updateAddress("instructions", value)}
              maxLength={INSTRUCTIONS_MAX}
              error={errors["deliveryAddress.instructions"]}
              rows={2}
              placeholder="Buzzer number, gate code, where to leave it"
            />
          </CheckoutSection>
        )}

        {/* 4. Contact */}
        <CheckoutSection
          step={step.contact}
          title="Your details"
          description="We'll only use these to reach you about this order."
        >
          <TextField
            name="customerName"
            label="Full name"
            value={contact.customerName}
            onValueChange={(value) => updateContact("customerName", value)}
            error={errors.customerName}
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
          />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <TextField
              name="email"
              label="Email"
              type="email"
              inputMode="email"
              value={contact.email}
              onValueChange={(value) => updateContact("email", value)}
              error={errors.email}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
            />
            <TextField
              name="phone"
              label="Mobile phone"
              type="tel"
              inputMode="tel"
              value={contact.phone}
              onValueChange={(value) => updateContact("phone", value)}
              error={errors.phone}
              hint="We'll only call if there's a question about your order."
              autoComplete="tel"
              enterKeyHint="next"
            />
          </div>
        </CheckoutSection>

        {/* 5. Tip */}
        <CheckoutSection
          step={tipStep}
          title="Add a tip"
          description={`Added to what you pay ${isDelivery ? "when your order arrives" : "at pickup"}.`}
        >
          <TipSelector subtotalCents={subtotalCents} rate={tipRate} onRateChange={setTipRate} />
        </CheckoutSection>

        {/* 6. Notes */}
        <CheckoutSection step={notesStep} title="Anything else?">
          <TextAreaField
            name="notes"
            label="Order notes"
            optional
            value={notes}
            onValueChange={(value) => {
              setNotes(value);
              clearError("notes");
            }}
            maxLength={NOTES_MAX}
            error={errors.notes}
            rows={3}
            placeholder="Extra napkins, cutlery, anything the kitchen should know"
          />
        </CheckoutSection>

        {/* 7. Payment */}
        <CheckoutSection step={paymentStep} title="Payment">
          <RadioGroup value="PAY_IN_PERSON" aria-label="Payment method" className="grid gap-3">
            <ChoiceCard
              id={fieldId("payment-in-person")}
              value="PAY_IN_PERSON"
              icon={Wallet}
              title="Pay in person"
              description={
                isDelivery
                  ? "Pay when your order arrives at your door."
                  : "Pay at the counter when you collect your order."
              }
            />
            <ChoiceCard
              id={fieldId("payment-card")}
              value="CARD"
              icon={CreditCard}
              title="Card — coming soon"
              description="Secure online card payments are on the way."
              disabled
            />
          </RadioGroup>
        </CheckoutSection>
      </div>

      {/* Summary + submit: sticky right column on md+, after the form on mobile */}
      <div className="min-w-0 space-y-4 md:sticky md:top-20 md:-m-1 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:overscroll-contain md:p-1">
        <div className="overflow-hidden rounded-2xl border border-border bg-card md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
          <button
            type="button"
            onClick={() => setSummaryOpen((open) => !open)}
            aria-expanded={summaryOpen}
            aria-controls={summaryPanelId}
            className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset md:hidden"
          >
            <span className="font-bold">Order summary</span>
            <span className="text-sm text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="ml-auto font-bold tabular-nums">{formatPrice(totals.totalCents)}</span>
            <ChevronDown
              className={cn(
                "size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                summaryOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
          <div id={summaryPanelId} className={cn(summaryOpen ? "block" : "hidden", "md:block")}>
            <OrderSummary
              lines={summaryLines}
              totals={totals}
              fulfillment={fulfillment}
              estimated
              tipRate={tipRate}
              hideHeading={!isDesktop}
              headingId={summaryHeadingId}
              className="rounded-none border-0 border-t md:rounded-2xl md:border"
              footer={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCartOpen(true)}
                  aria-haspopup="dialog"
                  className="mt-4 h-11 w-full rounded-full text-sm font-semibold"
                >
                  Edit cart
                </Button>
              }
            />
          </div>
        </div>

        {formAlert && (
          <Alert variant="destructive" className="rounded-xl border-destructive/40 bg-destructive/5 px-4 py-3">
            <CircleAlert aria-hidden="true" />
            <AlertTitle className="font-semibold">{formAlert.title}</AlertTitle>
            <AlertDescription className="text-destructive/90">
              <p>{formAlert.message}</p>
              {formAlert.action === "edit-cart" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCartOpen(true)}
                  aria-haspopup="dialog"
                  className="mt-3 h-11 rounded-full px-5 text-foreground"
                >
                  Edit cart
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={submitting}
          aria-describedby="checkout-submit-note"
          className="h-12 w-full rounded-full px-6 text-base font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Placing order…
            </>
          ) : (
            <>Place order · {formatPrice(totals.totalCents)}</>
          )}
        </Button>
        <p id="checkout-submit-note" className="text-center text-xs text-muted-foreground">
          Nothing is charged now. You&apos;ll pay in person {isDelivery ? "when your order arrives" : "at pickup"}.
        </p>
      </div>
    </form>
  );
}

function CheckoutSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <p role="status" className="sr-only">
        Loading your order…
      </p>
      <div className="space-y-5" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-5 w-44" />
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-14 rounded-2xl md:h-80" />
        <Skeleton className="h-12 rounded-full" />
      </div>
    </div>
  );
}
