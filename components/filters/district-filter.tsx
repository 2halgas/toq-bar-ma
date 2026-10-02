"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISTRICT_IDS, DISTRICT_LABELS, DistrictSchema, type District } from "@/lib/schema";

const ALL = "all";

interface DistrictFilterProps {
  value: District | null;
  /** Outages per district for the current date and search, shown next to each option. */
  counts: Record<District, number>;
  onChange: (value: District | null) => void;
}

export function DistrictFilter({ value, counts, onChange }: DistrictFilterProps) {
  const triggerId = useId();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={triggerId}>Район</Label>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => {
          const district = DistrictSchema.safeParse(next);
          onChange(district.success ? district.data : null);
        }}
      >
        <SelectTrigger id={triggerId} className="h-10! w-full">
          {/* Explicit label: the trigger shouldn't repeat the per-district counts from the items. */}
          <SelectValue>{value ? DISTRICT_LABELS[value] : "Все районы"}</SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL}>Все районы</SelectItem>
          {DISTRICT_IDS.map((district) => (
            <SelectItem key={district} value={district}>
              <span>{DISTRICT_LABELS[district]}</span>
              <span className="ml-auto pl-3 text-muted-foreground tabular-nums">
                <span className="sr-only">, отключений: </span>
                {counts[district]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
