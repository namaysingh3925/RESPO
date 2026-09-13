"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import type { CartLine as CartLineData } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

export const LINE_NOTE_MAX = 200;

interface CartLineProps {
  line: CartLineData;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onNotesChange: (notes: string) => void;
  className?: string;
}

/** One cart row: thumbnail, name, unit price, stepper, remove, line total and an optional kitchen note. */
export function CartLine({ line, onQuantityChange, onRemove, onNotesChange, className }: CartLineProps) {
  const [noteOpen, setNoteOpen] = useState(Boolean(line.notes));
  const noteId = useId();
  const counterId = `${noteId}-count`;
  const notes = line.notes ?? "";

  return (
    <li className={cn("flex gap-3 py-4", className)}>
      <div className="relative size-18 shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image
          src={line.imageUrl}
          alt=""
          fill
          sizes="72px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base leading-snug font-semibold text-foreground">{line.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatPrice(line.priceCents)} each</p>
          </div>
          <p className="shrink-0 text-base font-semibold tabular-nums">
            <span className="sr-only">Line total </span>
            {formatPrice(line.priceCents * line.quantity)}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            value={line.quantity}
            onChange={onQuantityChange}
            min={0}
            max={siteConfig.ordering.maxQuantityPerLine}
            label={line.name}
          />
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setNoteOpen((open) => !open)}
              aria-expanded={noteOpen}
              aria-controls={noteId}
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageSquarePlus className="size-4" aria-hidden="true" />
              {notes ? "Edit note" : "Add note"}
              <span className="sr-only"> for {line.name}</span>
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${line.name}`}
              className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {!noteOpen && notes && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground italic">&ldquo;{notes}&rdquo;</p>
        )}

        <div id={noteId} hidden={!noteOpen} className="mt-2">
          <Label htmlFor={`${noteId}-input`} className="mb-1.5 text-sm">
            Note for the kitchen
          </Label>
          <Textarea
            id={`${noteId}-input`}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value.slice(0, LINE_NOTE_MAX))}
            maxLength={LINE_NOTE_MAX}
            rows={2}
            placeholder="e.g. no pickles, sauce on the side"
            aria-describedby={counterId}
            className="min-h-16 rounded-xl bg-background text-base"
          />
          <p id={counterId} className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
            {notes.length}/{LINE_NOTE_MAX}
          </p>
        </div>
      </div>
    </li>
  );
}
