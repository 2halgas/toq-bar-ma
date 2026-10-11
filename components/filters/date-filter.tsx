"use client";

import { CalendarIcon } from "lucide-react";
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

        {/* Takes whatever the buttons leave (and may shrink) instead of a fixed width.
            iOS 26 gives the native date input a minimum width wider than the screen and
            ignores width/min-width, so the input is absolutely positioned (can't widen the
            layout) and clipped by this box, which draws the border and focus ring itself. */}
        <div
          className={cn(
            "relative h-10 min-w-0 overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 min-[420px]:max-w-48 min-[420px]:flex-1 dark:bg-input/30",
            pickedDate && "border-primary ring-1 ring-primary",
          )}
        >
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
            // No `block`/`appearance-none`: iOS Safari then misaligns the value vertically.
            className={cn(
              "peer absolute inset-0 size-full min-w-0 bg-transparent px-3 text-left text-base outline-none md:text-sm dark:[color-scheme:dark] [&::-webkit-date-and-time-value]:text-left",
              pickedDate
                ? "font-medium"
                : // Empty: iOS shows a blank box and Chrome «дд.мм.гггг»; both are hidden
                  // behind our own hint until the field is focused.
                  "text-transparent focus:text-muted-foreground",
            )}
          />
          {!pickedDate && (
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-2 text-base text-muted-foreground peer-focus:hidden md:text-sm"
              aria-hidden
            >
              <CalendarIcon className="size-4" />
              {t("otherDate")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
