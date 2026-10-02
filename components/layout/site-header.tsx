import { ZapIcon } from "lucide-react";

import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-7xl space-y-4 px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-900 text-brand dark:bg-neutral-800 dark:ring-1 dark:ring-white/10"
            aria-hidden
          >
            <ZapIcon className="size-5 fill-current" />
          </span>
          <div>
            <h1 className="text-xl leading-tight font-semibold tracking-tight sm:text-2xl">
              {siteConfig.name}
            </h1>
            <p className="text-sm text-muted-foreground">Плановые отключения света в Алматы</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <DisclaimerBanner />
    </header>
  );
}
