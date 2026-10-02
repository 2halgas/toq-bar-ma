import { useTranslations } from "next-intl";
import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Link that opens in a new tab and announces it to screen readers. */
export function ExternalLink({
  children,
  className,
  ...props
}: Omit<ComponentProps<"a">, "target" | "rel">) {
  const t = useTranslations("Common");

  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "rounded-sm font-medium underline underline-offset-4 hover:decoration-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {children}
      <span className="sr-only"> {t("opensInNewTab")}</span>
    </a>
  );
}
