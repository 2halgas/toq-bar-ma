"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ResCount } from "@/lib/filter";

const ALL = "all";

interface ResFilterProps {
  value: number | null;
  /** Every РЭС in the schedule, with outages matching the current date and search. */
  options: ResCount[];
  onChange: (value: number | null) => void;
}

export function ResFilter({ value, options, onChange }: ResFilterProps) {
  const t = useTranslations("ResFilter");
  const tCommon = useTranslations("Common");
  const triggerId = useId();
  const hintId = useId();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={triggerId}>{t("label")}</Label>
      <Select
        value={value === null ? ALL : String(value)}
        onValueChange={(next) => onChange(next === ALL ? null : Number(next))}
      >
        <SelectTrigger id={triggerId} aria-describedby={hintId} className="h-10! w-full">
          {/* Explicit label: the trigger shouldn't repeat the per-option counts. */}
          <SelectValue>{value === null ? t("all") : tCommon("res", { number: value })}</SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL}>{t("all")}</SelectItem>
          {options.map(({ res, count }) => (
            <SelectItem key={res} value={String(res)}>
              <span>{tCommon("res", { number: res })}</span>
              <span className="ml-auto pl-3 text-muted-foreground tabular-nums">
                <span className="sr-only">{t("countLabel")}</span>
                {count}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={hintId} className="text-xs text-muted-foreground">
        {t("hint")}
      </p>
    </div>
  );
}
