"use client";

import { catchError, type ErrorInfo } from "next/error";

import { ErrorMessage } from "@/components/errors/error-message";

/**
 * The map has its own boundary: if Leaflet or the tiles fail, the list next to
 * it keeps working instead of the whole page going down with it.
 */
function MapErrorFallback({ className }: { className?: string }, { error, retry }: ErrorInfo) {
  return <ErrorMessage scope="map" error={error} retry={retry} className={className} />;
}

export const MapErrorBoundary = catchError(MapErrorFallback);
