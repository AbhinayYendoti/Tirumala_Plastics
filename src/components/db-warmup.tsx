"use client";

import { useEffect } from "react";

// Neon's free plan puts the database to sleep after 5 idle minutes; wake it a little before that.
const IDLE_MS = 4 * 60 * 1000;

function ping() {
  fetch("/api/warm", { cache: "no-store", keepalive: true }).catch(() => {});
}

/**
 * Wakes the database in the background:
 *  - once when the page opens,
 *  - when the tab / installed app comes back into view after a few minutes away,
 *  - on the first mouse move, tap or key press after a few minutes of no activity
 *    (the tab was left open on screen while nobody used it).
 * The ~1s wake-up then happens while the user is still reaching for a button.
 */
export function DbWarmup() {
  useEffect(() => {
    let lastActive = Date.now();
    let lastPing = 0;

    const wake = () => {
      const now = Date.now();
      if (now - lastPing < 30_000) return; // never more than one ping per 30s
      lastPing = now;
      ping();
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActive > IDLE_MS) wake();
      lastActive = now;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onActivity();
    };

    wake();
    const events = ["pointermove", "pointerdown", "keydown", "touchstart", "focus"] as const;
    for (const e of events) window.addEventListener(e, onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      for (const e of events) window.removeEventListener(e, onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
