"use client";

import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Stable DOM id for a form field key such as "deliveryAddress.line1". */
export function fieldId(key: string): string {
  return `checkout-${key.replace(/\./g, "-")}`;
}

export function describedBy(key: string, opts: { hint?: boolean; error?: boolean }): string | undefined {
  const ids = [opts.hint && `${fieldId(key)}-hint`, opts.error && `${fieldId(key)}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function FieldError({ name, message }: { name: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${fieldId(name)}-error`} className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

export function FieldHint({ name, children }: { name: string; children: ReactNode }) {
  return (
    <p id={`${fieldId(name)}-hint`} className="text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** Numbered checkout section: a fieldset whose legend reads "1 How would you like it?". */
export function CheckoutSection({
  step,
  title,
  description,
  children,
  className,
}: {
  step: number;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <legend className="float-left mb-4 flex w-full items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-charcoal text-sm font-bold text-cream tabular-nums"
        >
          {step}
        </span>
        <span className="text-lg leading-tight font-bold">{title}</span>
      </legend>
      <div className="clear-both space-y-4">
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        {children}
      </div>
    </fieldset>
  );
}

const controlClass = "h-12 rounded-xl bg-background px-3.5 text-base md:text-base";

type TextFieldProps = Omit<ComponentProps<"input">, "id" | "name" | "onChange" | "value"> & {
  name: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
};

export function TextField({
  name,
  label,
  value,
  onValueChange,
  error,
  hint,
  optional,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = fieldId(name);
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, { hint: Boolean(hint), error: Boolean(error) })}
        aria-required={optional ? undefined : true}
        className={controlClass}
        {...inputProps}
      />
      {hint && <FieldHint name={name}>{hint}</FieldHint>}
      <FieldError name={name} message={error} />
    </div>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id" | "name" | "onChange" | "value"> & {
  name: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  maxLength: number;
  error?: string;
  optional?: boolean;
};

export function TextAreaField({
  name,
  label,
  value,
  onValueChange,
  maxLength,
  error,
  optional,
  className,
  ...textareaProps
}: TextAreaFieldProps) {
  const id = fieldId(name);
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      <Textarea
        id={id}
        name={name}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onValueChange(event.target.value.slice(0, maxLength))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, { hint: true, error: Boolean(error) })}
        className="min-h-24 rounded-xl bg-background px-3.5 py-3 text-base md:text-base"
        {...textareaProps}
      />
      <FieldHint name={name}>
        <span className="block text-right text-xs tabular-nums">
          {value.length}/{maxLength}
        </span>
      </FieldHint>
      <FieldError name={name} message={error} />
    </div>
  );
}
