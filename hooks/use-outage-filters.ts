"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { type OutageFilters } from "@/lib/filter";
import { parseFilters, toQueryString } from "@/lib/search-params";

/**
 * Filter state backed by the URL, so every view is shareable. Uses the native
 * History API (which Next.js syncs with `useSearchParams`) instead of router
 * navigation: no server round-trip and no history entry per keystroke.
 */
export function useOutageFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<OutageFilters>) => {
      // Read the live URL rather than the render-time `filters`: a debounced
      // search update must not overwrite a date/district change made meanwhile.
      const current = parseFilters(new URLSearchParams(window.location.search));
      window.history.replaceState(
        null,
        "",
        `${pathname}${toQueryString({ ...current, ...patch })}`,
      );
    },
    [pathname],
  );

  const resetFilters = useCallback(() => {
    window.history.replaceState(null, "", pathname);
  }, [pathname]);

  return { filters, updateFilters, resetFilters };
}
