"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { describeError } from "@/components/admin/utils";

interface Identifiable {
  id: string;
}

interface Snapshot<T> {
  key: string;
  items: T[];
  fetchedAt: number;
}

export type UpdateResult<T> = { ok: true; item: T } | { ok: false; message: string };

export interface LiveList<T extends Identifiable> {
  /** What is being shown, e.g. a restaurant-local date. */
  key: string;
  items: T[];
  /** First load for `key` is in flight — nothing to show yet. */
  isLoading: boolean;
  /** Any request is in flight (initial load, poll or manual refresh). */
  isRefreshing: boolean;
  /** Message from the latest failed request for `key`; cleared by the next success. */
  error: string | null;
  /** Epoch ms of the last successful load for `key`. */
  lastUpdated: number | null;
  /** Items with a status change in flight. */
  pendingIds: ReadonlySet<string>;
  setKey: (key: string) => void;
  refresh: () => void;
  /** Optimistically replaces `current` with `optimistic`, then with the server result — or rolls back. */
  update: (current: T, optimistic: T, request: () => Promise<T>) => Promise<UpdateResult<T>>;
}

interface UseLiveListOptions<T> {
  initialKey: string;
  initialItems: T[];
  /** Epoch ms when the initial items were loaded on the server. */
  initialFetchedAt: number;
  /** Must be referentially stable (define at module level). */
  buildUrl: (key: string) => string;
  /** Must be referentially stable (define at module level). */
  select: (data: unknown) => T[];
  pollMs: number;
}

const EMPTY: never[] = [];
/** Ignore focus/visibility refreshes that land right after another request started. */
const FOCUS_DEBOUNCE_MS = 3_000;

/**
 * A server list kept fresh by polling (plus refresh on window focus), with optimistic per-item updates.
 * Poll results never clobber an item whose update is in flight or settled after the poll started.
 */
export function useLiveList<T extends Identifiable>({
  initialKey,
  initialItems,
  initialFetchedAt,
  buildUrl,
  select,
  pollMs,
}: UseLiveListOptions<T>): LiveList<T> {
  const [key, setKeyState] = useState(initialKey);
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({
    key: initialKey,
    items: initialItems,
    fetchedAt: initialFetchedAt,
  });
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());

  const keyRef = useRef(initialKey);
  /** Monotonic sequence shared by requests and mutations so their relative order is known. */
  const seqRef = useRef(0);
  const latestRequestRef = useRef(0);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const lastStartedAtRef = useRef(0);
  const pendingRef = useRef(new Set<string>());
  const touchedAtRef = useRef(new Map<string, number>());

  const load = useCallback(
    async (target: string) => {
      const requestSeq = ++seqRef.current;
      latestRequestRef.current = requestSeq;
      inFlightRef.current = true;
      lastStartedAtRef.current = Date.now();
      setIsRefreshing(true);

      const isCurrent = () => requestSeq === latestRequestRef.current && target === keyRef.current;
      try {
        const data = await apiFetch<unknown>(buildUrl(target), { cache: "no-store" });
        if (!isCurrent()) return;
        const fresh = select(data);
        const keepLocal = new Set(
          fresh
            .filter(
              (item) =>
                pendingRef.current.has(item.id) ||
                (touchedAtRef.current.get(item.id) ?? 0) > requestSeq,
            )
            .map((item) => item.id),
        );
        const fetchedAt = Date.now();
        setSnapshot((prev) => {
          const local = prev.key === target ? new Map(prev.items.map((item) => [item.id, item])) : null;
          return {
            key: target,
            fetchedAt,
            items: fresh.map((item) => (keepLocal.has(item.id) ? (local?.get(item.id) ?? item) : item)),
          };
        });
        setError(null);
      } catch (err) {
        if (!isCurrent()) return;
        setError({ key: target, message: describeError(err) });
      } finally {
        if (requestSeq === latestRequestRef.current) {
          inFlightRef.current = false;
          setIsRefreshing(false);
          if (queuedRef.current) {
            queuedRef.current = false;
            void load(keyRef.current);
          }
        }
      }
    },
    [buildUrl, select],
  );

  const refresh = useCallback(() => {
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    void load(keyRef.current);
  }, [load]);

  const setKey = useCallback(
    (next: string) => {
      if (next === keyRef.current) return;
      keyRef.current = next;
      queuedRef.current = false;
      setKeyState(next);
      void load(next);
    },
    [load],
  );

  const update = useCallback(
    async (current: T, optimistic: T, request: () => Promise<T>): Promise<UpdateResult<T>> => {
      const { id } = current;
      if (pendingRef.current.has(id)) {
        return { ok: false, message: "An update for this item is already in progress." };
      }
      const replace = (next: T) =>
        setSnapshot((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === id ? next : item)),
        }));

      pendingRef.current.add(id);
      touchedAtRef.current.set(id, ++seqRef.current);
      setPendingIds((prev) => new Set(prev).add(id));
      replace(optimistic);

      let result: UpdateResult<T>;
      let resync = false;
      try {
        const saved = await request();
        replace(saved);
        result = { ok: true, item: saved };
      } catch (err) {
        replace(current);
        result = { ok: false, message: describeError(err) };
        // Someone else probably changed it first — pull the latest state.
        resync = err instanceof ApiError && (err.code === "INVALID_TRANSITION" || err.code === "NOT_FOUND");
      } finally {
        pendingRef.current.delete(id);
        touchedAtRef.current.set(id, ++seqRef.current);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      if (resync) refresh();
      return result;
    },
    [refresh],
  );

  useEffect(() => {
    const timer = window.setInterval(refresh, pollMs);
    const onFocus = () => {
      if (Date.now() - lastStartedAtRef.current > FOCUS_DEBOUNCE_MS) refresh();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pollMs, refresh]);

  const hasData = snapshot.key === key;
  const currentError = error?.key === key ? error.message : null;

  return {
    key,
    items: hasData ? snapshot.items : EMPTY,
    isLoading: !hasData && currentError === null,
    isRefreshing,
    error: currentError,
    lastUpdated: hasData ? snapshot.fetchedAt : null,
    pendingIds,
    setKey,
    refresh,
    update,
  };
}
