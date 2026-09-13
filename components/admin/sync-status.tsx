"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { formatClockWithSeconds } from "@/components/admin/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SyncStatusProps {
  lastUpdated: number | null;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  /** e.g. "every 15 s" */
  cadence: string;
  /** Accessible name for the refresh button, e.g. "Refresh orders". */
  refreshLabel: string;
  className?: string;
}

/** "● Live · Last updated 7:02:45 PM" with a manual refresh button and a polite live error message. */
export function SyncStatus({
  lastUpdated,
  isRefreshing,
  error,
  onRefresh,
  cadence,
  refreshLabel,
  className,
}: SyncStatusProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
          {!error && (
            <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
          )}
          <span
            className={cn("relative inline-flex size-2.5 rounded-full", error ? "bg-amber-500" : "bg-emerald-600")}
          />
        </span>
        <span>
          {lastUpdated ? (
            <>
              Last updated <time dateTime={new Date(lastUpdated).toISOString()}>{formatClockWithSeconds(lastUpdated)}</time>
            </>
          ) : (
            "Loading…"
          )}
          <span className="hidden sm:inline"> · refreshes {cadence}</span>
        </span>
      </p>
      <Button
        type="button"
        variant="ghost"
        onClick={onRefresh}
        aria-label={refreshLabel}
        className="size-11 rounded-full p-0"
      >
        <RefreshCw
          className={cn("size-4", isRefreshing && "motion-safe:animate-spin")}
          aria-hidden="true"
        />
      </Button>
      <p role="status" aria-live="polite" className="basis-full empty:hidden">
        {error && (
          <span className="flex items-start gap-1.5 text-xs font-medium text-amber-800">
            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            Couldn&apos;t refresh: {error} We&apos;ll keep trying.
          </span>
        )}
      </p>
    </div>
  );
}
