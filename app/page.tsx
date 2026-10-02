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
      className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,26rem)_1fr]"
      aria-busy="true"
      aria-label="Загрузка"
    >
      <div className="space-y-4">
        {[44, 40, 40].map((height, index) => (
          <div key={index} className="animate-pulse rounded-lg bg-muted" style={{ height }} />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
