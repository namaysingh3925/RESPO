"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface ChoiceCardProps {
  /** DOM id of the radio; the card's title and description ids derive from it. */
  id: string;
  value: string;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned detail such as "~20 min" or "Soon". */
  meta?: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

/**
 * A whole-card radio option for a <RadioGroup>. The card is the click target; the radio is named by the
 * title alone and described by the description, so screen readers don't read one long label.
 */
export function ChoiceCard({ id, value, title, description, meta, icon: Icon, disabled, className }: ChoiceCardProps) {
  const titleId = `${id}-title`;
  const metaId = `${id}-meta`;
  const descriptionId = `${id}-description`;
  const describedBy = [meta && metaId, description && descriptionId].filter(Boolean).join(" ") || undefined;

  return (
    <Label
      htmlFor={id}
      data-disabled={disabled ? "true" : undefined}
      className={cn(
        "relative flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-base leading-snug font-normal transition-colors select-none hover:border-foreground/30",
        "has-[[data-state=checked]]:border-ember has-[[data-state=checked]]:bg-ember/5 has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-ember",
        "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground hover:border-border",
        className,
      )}
    >
      <RadioGroupItem
        id={id}
        value={value}
        disabled={disabled}
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        className="mt-0.5 bg-background"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start justify-between gap-3">
          <span id={titleId} className="flex items-center gap-2 font-semibold text-foreground">
            {Icon && (
              <Icon
                className={cn("size-4 shrink-0", disabled ? "text-muted-foreground" : "text-ember")}
                aria-hidden="true"
              />
            )}
            {title}
          </span>
          {meta && (
            <span id={metaId} className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
              {meta}
            </span>
          )}
        </span>
        {description && (
          <span id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </Label>
  );
}
