"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { PLACE_HIDDEN, type AzhkOutage } from "@/lib/azhk/schema";
import { extractToponyms } from "@/lib/azhk/toponyms";
import { buildCalendar, downloadCalendar, shortenPlace, type CalendarEvent } from "@/lib/calendar";

/** Places named in a title: enough to recognise it on a phone's calendar. */
const TITLE_PLACES = 2;

/** Returns a function that downloads outages as an .ics file, with texts in the UI language. */
export function useCalendarExport() {
  const t = useTranslations("Calendar");
  const tCard = useTranslations("Card");
  const tCommon = useTranslations("Common");
  const tRepair = useTranslations("RepairType");

  return useCallback(
    (outages: readonly AzhkOutage[], fileName: string) => {
      const events = outages.map((outage): CalendarEvent => {
        const place = outage.place === PLACE_HIDDEN ? tCard("placeHidden") : outage.place;
        // «мкр. Айгерим-1, ул. Аксайская и ещё 2» reads better than the raw
        // «жилые дома (частный сектор) мкр. …»; fall back to the text itself.
        const labels = extractToponyms(outage.place).map((toponym) => toponym.label);
        const titlePlace =
          labels.length === 0
            ? shortenPlace(place)
            : labels.length <= TITLE_PLACES
              ? labels.join(", ")
              : t("andMore", {
                  places: labels.slice(0, TITLE_PLACES).join(", "),
                  count: labels.length - TITLE_PLACES,
                });
        return {
          uid: `${outage.id}@toq-bar-ma`,
          date: outage.date,
          timeFrom: outage.timeFrom,
          timeTo: outage.timeTo,
          summary: t("summary", { place: titlePlace }),
          location: place,
          description: [
            place,
            `${tCard("equipment")}: ${outage.dispatchName}`,
            `${tCard("workType")}: ${tRepair(outage.repairType)}`,
            tCommon("res", { number: outage.res }),
            t("source", { url: outage.sourceUrl }),
            t("disclaimer", { site: window.location.origin }),
          ].join("\n"),
          url: outage.sourceUrl,
          reminder: t("reminder", { hours: `${outage.timeFrom}–${outage.timeTo}` }),
        };
      });
      downloadCalendar(fileName, buildCalendar(events));
    },
    [t, tCard, tCommon, tRepair],
  );
}
