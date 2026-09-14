import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Props a FormField hands to its control so label, hint and error stay wired up. */
export interface FieldControlProps {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
}

export function FieldError({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} className={cn("flex items-start gap-1.5 text-sm font-medium text-destructive", className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label + control + hint + inline error, with aria-invalid / aria-describedby handled in one place. */
export function FormField({ id, label, optional = false, hint, error, className, children }: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy || undefined })}
      {hint ? (
        <div id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </div>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

interface FormSectionProps {
  step: number;
  title: string;
  description?: ReactNode;
  /** Error message id(s) describing the whole group. */
  describedBy?: string;
  children: ReactNode;
  className?: string;
}

/** A numbered step of the booking form, rendered as a fieldset so its controls share a group name. */
export function FormSection({ step, title, description, describedBy, children, className }: FormSectionProps) {
  return (
    <fieldset aria-describedby={describedBy} className={cn("min-w-0 border-t border-border pt-6", className)}>
      <legend className="float-left flex w-full items-baseline gap-3">
        <span aria-hidden="true" className="text-xs font-bold tracking-[0.2em] text-ember tabular-nums">
          {String(step).padStart(2, "0")}
        </span>
        <span className="text-lg leading-tight font-bold">{title}</span>
      </legend>
      <div className="clear-both pt-3">
        {description ? <p className="mb-3 text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </div>
    </fieldset>
  );
}
