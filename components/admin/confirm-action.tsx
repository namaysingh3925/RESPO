"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmActionProps {
  /** Trigger button content. */
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  triggerClassName?: string;
  /** Accessible name for the trigger when its visible text is ambiguous (e.g. "Cancel order EH-4XK92M"). */
  triggerLabel?: string;
}

/** A destructive staff action guarded by an alert dialog. */
export function ConfirmAction({
  children,
  title,
  description,
  confirmLabel,
  cancelLabel = "Go back",
  onConfirm,
  disabled,
  triggerClassName,
  triggerLabel,
}: ConfirmActionProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={triggerLabel}
          className={cn(
            "h-11 rounded-full px-4 text-sm font-semibold text-red-700 hover:bg-red-50 hover:text-red-800",
            triggerClassName,
          )}
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* Action/Cancel merge classes via Slot without tailwind-merge, so only add non-conflicting utilities. */}
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" className="min-h-11 min-w-24">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" size="lg" onClick={onConfirm} className="min-h-11 min-w-28">
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
