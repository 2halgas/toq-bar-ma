import { getOutagesData } from "@/lib/data";
import { DISTRICT_IDS, DISTRICT_LABELS } from "@/lib/schema";

export default function Home() {
  const { outages } = getOutagesData();

  // Temporary placeholder until filters, list and map arrive in the next steps.
  return (
    <section
      aria-labelledby="outages-heading"
      className="mx-auto w-full max-w-7xl space-y-3 px-4 py-6 sm:px-6"
    >
      <h2 id="outages-heading" className="text-lg font-semibold">
        Отключения на неделю: {outages.length}
      </h2>
      <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
        {DISTRICT_IDS.map((district) => (
          <li key={district}>
            {DISTRICT_LABELS[district]}:{" "}
            {outages.filter((outage) => outage.district === district).length}
          </li>
        ))}
      </ul>
    </section>
  );
}
