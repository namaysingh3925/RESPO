"use client";

import { useEffect, useState } from "react";

/**
 * Distance from the viewport top to just below the fixed header (h-16) and the sticky category bar,
 * plus a little slack so a section scrolled to with `scroll-mt-32` (128px) already counts as current.
 */
const SPY_TOP_OFFSET = 140;

/** Keys that scroll the page. Pressing one hands the highlight back to the observer. */
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

export interface ScrollSpy {
  /** The section currently under the sticky bar (falls back to the first id). */
  activeId: string | null;
  /** Highlight `id` straight away — e.g. after a nav click — until the visitor scrolls by hand. */
  pin: (id: string) => void;
}

/**
 * Scroll-spy for in-page sections. An IntersectionObserver watches a band just below the sticky bar and the
 * first section crossing it wins. Near the bottom of the page, where a short last section can never reach
 * the band, the last section is highlighted instead.
 */
export function useScrollSpy(ids: readonly string[]): ScrollSpy {
  const [observedId, setObservedId] = useState<string | null>(null);
  const [atPageEnd, setAtPageEnd] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const idsKey = ids.join(" ");

  useEffect(() => {
    if (!idsKey || typeof IntersectionObserver === "undefined") return;
    const targets = idsKey
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const intersecting = new Set<string>();

    // When nothing crosses the band (e.g. after jumping with Home/End), decide by position.
    const edgeTarget = () => {
      const first = targets[0];
      if (first.getBoundingClientRect().top > SPY_TOP_OFFSET) return first;
      const last = targets[targets.length - 1];
      if (last.getBoundingClientRect().bottom < SPY_TOP_OFFSET) return last;
      return undefined;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        }
        const current = targets.find((el) => intersecting.has(el.id)) ?? edgeTarget();
        if (current) setObservedId(current.id);
      },
      { rootMargin: `-${SPY_TOP_OFFSET}px 0px -55% 0px`, threshold: 0 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [idsKey]);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const { scrollHeight } = document.documentElement;
      setAtPageEnd(window.scrollY > 0 && window.innerHeight + window.scrollY >= scrollHeight - 2);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  // A pinned highlight survives the programmatic smooth scroll and is released by the next manual scroll.
  useEffect(() => {
    if (!pinnedId) return;
    const release = () => setPinnedId(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) release();
    };
    const options = { capture: true, passive: true } as const;

    window.addEventListener("wheel", release, options);
    window.addEventListener("touchstart", release, options);
    window.addEventListener("pointerdown", release, options);
    window.addEventListener("keydown", onKeyDown, options);
    return () => {
      window.removeEventListener("wheel", release, options);
      window.removeEventListener("touchstart", release, options);
      window.removeEventListener("pointerdown", release, options);
      window.removeEventListener("keydown", onKeyDown, options);
    };
  }, [pinnedId]);

  const known = (id: string | null) => (id !== null && ids.includes(id) ? id : null);
  const lastId = ids.length > 0 ? ids[ids.length - 1] : null;

  return {
    activeId: known(pinnedId) ?? (atPageEnd ? lastId : null) ?? known(observedId) ?? ids[0] ?? null,
    pin: setPinnedId,
  };
}
