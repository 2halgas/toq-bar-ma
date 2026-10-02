import { getOutagesData } from "@/lib/data";
import { DISTRICT_IDS, DISTRICT_LABELS } from "@/lib/schema";
import { siteConfig } from "@/lib/site";

export default function Home() {
  const { outages, isDemo, updatedAt } = getOutagesData();
  const dates = outages.map((outage) => outage.date).sort();

  // Temporary placeholder: proves data loads and validates. Replaced by the real UI in later steps.
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="text-muted-foreground">
        Загружено {outages.length} отключений ({dates[0]} — {dates.at(-1)})
        {isDemo && ", демо-данные"}. Обновлено: {updatedAt}.
      </p>
      <ul className="grid grid-cols-2 gap-1 text-sm">
        {DISTRICT_IDS.map((district) => (
          <li key={district}>
            {DISTRICT_LABELS[district]}:{" "}
            {outages.filter((outage) => outage.district === district).length}
          </li>
        ))}
      </ul>
    </main>
  );
}
