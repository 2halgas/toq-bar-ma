import { Suspense } from "react";

import { OutagesExplorer } from "@/components/outages-explorer";
import { getOutagesData } from "@/lib/data";

export default function Home() {
  const { outages, title, sourceUrl, weekStart, weekEnd } = getOutagesData();

  // The explorer reads filters from the URL, so it renders on the client; the
  // header and footer around it are still prerendered.
  return (
    <Suspense fallback={<ExplorerSkeleton />}>
      <OutagesExplorer outages={outages} schedule={{ title, sourceUrl, weekStart, weekEnd }} />
    </Suspense>
  );
}

function ExplorerSkeleton() {
  return (
    <div
      className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] lg:gap-8"
      aria-busy="true"
      aria-label="Загрузка"
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
      <div className="space-y-3">
        {[48, 160, 160].map((height, index) => (
          <div
            key={index}
            className="rounded-xl bg-muted motion-safe:animate-pulse"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}
