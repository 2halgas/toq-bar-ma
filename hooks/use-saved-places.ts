"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  addPlace,
  parseSavedPlaces,
  removePlace,
  SAVED_PLACES_STORAGE_KEY,
} from "@/lib/saved-places";

/** Same-tab writes don't fire "storage", so we announce them ourselves. */
const CHANGE_EVENT = "toq-bar-ma:places-change";

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SAVED_PLACES_STORAGE_KEY) onChange(); // another tab
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// Storage can be unavailable (private mode, blocked site data): then there are
// simply no saved places, and saving does nothing.
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SAVED_PLACES_STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(places: string[]): void {
  try {
    window.localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(places));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Nothing to do: the list just isn't remembered.
  }
}

/** "My places", kept in this browser's localStorage and synced across tabs. */
export function useSavedPlaces() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const places = useMemo(() => parseSavedPlaces(raw), [raw]);

  const save = useCallback(
    (query: string) => write(addPlace(parseSavedPlaces(readRaw()), query)),
    [],
  );
  const remove = useCallback(
    (query: string) => write(removePlace(parseSavedPlaces(readRaw()), query)),
    [],
  );

  return { places, save, remove };
}
