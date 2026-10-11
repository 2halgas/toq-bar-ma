"use client";

import { StarIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { isPlaceSaved, MAX_SAVED_PLACES } from "@/lib/saved-places";
import { cn } from "@/lib/utils";

export interface SavedPlace {
  query: string;
  /** Outages from today to the end of the published schedule. */
  count: number;
}

interface SavedPlacesProps {
  /** Current search, offered for saving. */
  query: string;
  isQuerySaved: boolean;
  places: SavedPlace[];
  onSelect: (query: string) => void;
  onSave: (query: string) => void;
  onRemove: (query: string) => void;
}

export function SavedPlaces({
  query,
  isQuerySaved,
  places,
  onSelect,
  onSave,
  onRemove,
}: SavedPlacesProps) {
  const t = useTranslations("MyPlaces");
  const isFull = places.length >= MAX_SAVED_PLACES;

  return (
    <div className="space-y-2">
      {query &&
        (isQuerySaved ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            aria-label={t("unsave", { query })}
            onClick={() => onRemove(query)}
          >
            <StarIcon className="fill-brand text-brand" aria-hidden />
            {t("saved")}
          </Button>
        ) : isFull ? (
          <p className="text-xs text-muted-foreground">{t("full", { max: MAX_SAVED_PLACES })}</p>
        ) : (
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => onSave(query)}>
            <StarIcon aria-hidden />
            {t("save", { query })}
          </Button>
        ))}

      {places.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium">{t("heading")}</h3>
          <ul className="flex flex-wrap gap-2">
            {places.map((place) => {
              const isActive = query !== "" && isPlaceSaved([place.query], query);
              return (
                <li
                  key={place.query}
                  className={cn(
                    "flex max-w-full items-center rounded-full border bg-background text-sm",
                    isActive && "border-foreground",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-1.5 rounded-l-full py-1 pr-1 pl-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-pressed={isActive}
                    aria-label={t("select", { place: place.query, count: place.count })}
                    onClick={() => onSelect(place.query)}
                  >
                    <span className="truncate" lang="ru">
                      {place.query}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-xs tabular-nums",
                        place.count > 0
                          ? "bg-brand text-neutral-950"
                          : "bg-muted text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {place.count}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="grid size-7 shrink-0 place-items-center rounded-r-full text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label={t("remove", { place: place.query })}
                    onClick={() => onRemove(place.query)}
                  >
                    <XIcon className="size-3.5" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">{t("note")}</p>
        </div>
      )}
    </div>
  );
}
