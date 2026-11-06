"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { ExternalLink } from "@/components/layout/external-link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  /** "page": nothing could be shown; "map": only the map failed, the list still works. */
  scope: "page" | "map";
  /** Anything can be thrown; it is only logged. */
  error: unknown;
  retry: () => void;
  className?: string;
}

/** What people see instead of a blank "This page couldn't load" when something breaks. */
export function ErrorMessage({ scope, error, retry, className }: ErrorMessageProps) {
  const t = useTranslations("Errors");

  useEffect(() => {
    // No error reporting service: the browser console is where this goes.
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-muted" aria-hidden>
        <TriangleAlertIcon className="size-6 text-muted-foreground" />
      </span>
      <h2 className="mt-4 font-semibold">{scope === "map" ? t("mapTitle") : t("pageTitle")}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {scope === "map"
          ? t("mapDescription")
          : t.rich("pageDescription", {
              link: (chunks) => (
                <ExternalLink href={siteConfig.azhkScheduleUrl}>{chunks}</ExternalLink>
              ),
            })}
      </p>
      <Button variant="outline" className="mt-4" onClick={() => retry()}>
        <RotateCcwIcon aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}
