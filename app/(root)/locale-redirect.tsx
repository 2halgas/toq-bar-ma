"use client";

import { useEffect } from "react";

import { detectLocale } from "@/i18n/detect";
import { LOCALE_STORAGE_KEY } from "@/i18n/routing";

function readSavedLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, strict settings)
  }
}

/** Sends `/` (and old `/?q=…` links) to the visitor's language, keeping the filters. */
export function LocaleRedirect() {
  useEffect(() => {
    const locale = detectLocale(navigator.languages, readSavedLocale());
    window.location.replace(`/${locale}${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}
