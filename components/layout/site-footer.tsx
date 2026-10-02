import { useTranslations } from "next-intl";

import { ExternalLink } from "@/components/layout/external-link";
import { formatUpdatedAt } from "@/lib/dates";
import { siteConfig } from "@/lib/site";

interface SiteFooterProps {
  updatedAt: string;
  sourceUrl: string;
}

export function SiteFooter({ updatedAt, sourceUrl }: SiteFooterProps) {
  const t = useTranslations("Footer");

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {t.rich("updatedAt", {
            date: formatUpdatedAt(updatedAt),
            time: (chunks) => <time dateTime={updatedAt}>{chunks}</time>,
          })}
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          <li>
            <ExternalLink href={sourceUrl}>{t("source")}</ExternalLink>
          </li>
          <li>
            <ExternalLink href={siteConfig.githubUrl}>GitHub</ExternalLink>
          </li>
        </ul>
      </div>
    </footer>
  );
}
