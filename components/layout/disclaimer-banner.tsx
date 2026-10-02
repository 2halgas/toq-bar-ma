import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ExternalLink } from "@/components/layout/external-link";
import { siteConfig } from "@/lib/site";

export function DisclaimerBanner() {
  const t = useTranslations("Header");

  return (
    <div
      role="note"
      aria-label={t("noticeLabel")}
      className="rounded-xl border border-notice-border bg-notice px-4 py-3 text-sm text-notice-foreground"
    >
      <p className="flex gap-2.5">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {t.rich("disclaimer", {
            link: (chunks) => (
              <ExternalLink href={siteConfig.azhkScheduleUrl}>{chunks}</ExternalLink>
            ),
          })}
        </span>
      </p>
    </div>
  );
}
