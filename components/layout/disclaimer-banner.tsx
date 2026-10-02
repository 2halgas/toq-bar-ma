import { TriangleAlertIcon } from "lucide-react";

import { ExternalLink } from "@/components/layout/external-link";
import { siteConfig } from "@/lib/site";

export function DisclaimerBanner() {
  return (
    <div
      role="note"
      aria-label="Важно"
      className="rounded-xl border border-notice-border bg-notice px-4 py-3 text-sm text-notice-foreground"
    >
      <p className="flex gap-2.5">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Неофициальный сервис: данные автоматически берутся из графиков АО «Алатау Жарык
          Компаниясы» и могут содержать ошибки разбора. Всегда сверяйтесь с{" "}
          <ExternalLink href={siteConfig.azhkScheduleUrl}>графиком на сайте АЖК</ExternalLink>.
        </span>
      </p>
    </div>
  );
}
