import { FlaskConicalIcon, TriangleAlertIcon } from "lucide-react";

import { ExternalLink } from "@/components/layout/external-link";
import { siteConfig } from "@/lib/site";

interface DisclaimerBannerProps {
  isDemo: boolean;
}

export function DisclaimerBanner({ isDemo }: DisclaimerBannerProps) {
  return (
    <div
      role="note"
      aria-label="Важно"
      className="rounded-xl border border-notice-border bg-notice px-4 py-3 text-sm text-notice-foreground"
    >
      <p className="flex gap-2.5">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Неофициальный сервис. Всегда сверяйтесь с{" "}
          <ExternalLink href={siteConfig.azhkScheduleUrl}>графиком на сайте АЖК</ExternalLink>.
        </span>
      </p>
      {isDemo && (
        <p className="mt-2 flex gap-2.5">
          <FlaskConicalIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Сейчас показаны демо-данные.</strong> Улицы реальные,
            а даты и время отключений выдуманы и каждый день сдвигаются на ближайшую неделю.
          </span>
        </p>
      )}
    </div>
  );
}
