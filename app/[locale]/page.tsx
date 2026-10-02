import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use, Suspense } from "react";

import { OutagesExplorer } from "@/components/outages-explorer";
import { isLocale } from "@/i18n/routing";
import { getGeocache, getOutagesData } from "@/lib/data";
import { buildOutageViews } from "@/lib/map-points";

export default function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const { outages: rawOutages, title, sourceUrl, weekStart, weekEnd } = getOutagesData();
  // Joined at build time, so the client gets only coordinates for places in this schedule.
  const { outages, locations } = buildOutageViews(rawOutages, getGeocache());

  // The explorer reads filters from the URL, so it renders on the client; the
  // header and footer around it are still prerendered.
  return (
    <Suspense fallback={<ExplorerSkeleton />}>
      <OutagesExplorer
        outages={outages}
        locations={locations}
        schedule={{ title, sourceUrl, weekStart, weekEnd }}
      />
    </Suspense>
  );
}

function ExplorerSkeleton() {
  const t = useTranslations("Common");

  return (
    <div
      className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:gap-8"
      aria-busy="true"
      aria-label={t("loading")}
    >
      <div className="space-y-4">
        {[44, 40, 40].map((height, index) => (
          <div
            key={index}
            className="rounded-lg bg-muted motion-safe:animate-pulse"
            style={{ height }}
          />
        ))}
      </div>
      <div className="h-[60dvh] min-h-80 rounded-xl bg-muted motion-safe:animate-pulse lg:h-[calc(100dvh-2rem)]" />
    </div>
  );
}
