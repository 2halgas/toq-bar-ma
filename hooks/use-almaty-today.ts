"use client";

import { useSyncExternalStore } from "react";

import { getAlmatyToday } from "@/lib/dates";

const CHECK_INTERVAL_MS = 60_000;

function subscribe(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, CHECK_INTERVAL_MS);
  return () => window.clearInterval(timer);
}

/**
 * Today's date in Almaty (`YYYY-MM-DD`). Re-checked every minute, so "today" and
 * "tomorrow" roll over at local midnight even if the tab stays open.
 */
export function useAlmatyToday(): string {
  return useSyncExternalStore(subscribe, getAlmatyToday, getAlmatyToday);
}
