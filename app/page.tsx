import { Suspense } from "react";

import { OutagesExplorer } from "@/components/outages-explorer";
import { getOutagesData } from "@/lib/data";

export default function Home() {
  const { outages } = getOutagesData();

  // The explorer reads filters from the URL, so it renders on the client; the
  // header and footer around it are still prerendered.
  return (
    <Suspense fallback={<ExplorerSkeleton />}>
      <OutagesExplorer outages={outages} />
    </Suspense>
  );
}

function ExplorerSkeleton() {
  return (
    <div
      className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:gap-8"
      aria-busy="true"
      aria-label="Загрузка"
    >
      <div className="space-y-4">
        {[44, 40, 40].map((height, index) => (
          <div key={index} className="animate-pulse rounded-lg bg-muted" style={{ height }} />
        ))}
      </div>
      <div className="h-[60dvh] min-h-80 animate-pulse rounded-xl bg-muted lg:h-[calc(100dvh-2rem)]" />
    </div>
  );
}
