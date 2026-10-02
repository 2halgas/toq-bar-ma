"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type DateFilter as DateFilterValue } from "@/lib/filter";
import { cn } from "@/lib/utils";

const PRESETS = ["today", "tomorrow", "week"] as const;

type Preset = (typeof PRESETS)[number];

function isPreset(value: string): value is Preset {
  return (PRESETS as readonly string[]).includes(value);
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const t = useTranslations("DateFilter");
  const labelId = useId();
  const dateInputId = useId();
  const pickedDate = value.kind === "date" ? value.date : "";

  return (
    <div className="space-y-1.5">
      <span id={labelId} className="text-sm leading-none font-medium">
        {t("label")}
      </span>
      <div className="flex flex-col gap-2 min-[420px]:flex-row">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          aria-labelledby={labelId}
          value={value.kind === "date" ? "" : value.kind}
          // Radix allows deselecting the active item; ignore that so one option is always chosen.
          onValueChange={(next) => isPreset(next) && onChange({ kind: next })}
          className="w-full min-[420px]:w-auto"
        >
          {PRESETS.map((preset) => (
            <ToggleGroupItem
              key={preset}
              value={preset}
              className="h-10 flex-1 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground min-[420px]:flex-none"
            >
              {t(preset)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="min-[420px]:w-44">
          <Label htmlFor={dateInputId} className="sr-only">
            {t("otherDate")}
          </Label>
          <input
            id={dateInputId}
            type="date"
            value={pickedDate}
            onChange={(event) =>
              onChange(
                event.target.value ? { kind: "date", date: event.target.value } : { kind: "week" },
              )
            }
            className={cn(
              "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30 dark:[color-scheme:dark]",
              pickedDate
                ? "border-primary font-medium ring-1 ring-primary"
                : "text-muted-foreground",
            )}
          />
        </div>
      </div>
    </div>
  );
}
