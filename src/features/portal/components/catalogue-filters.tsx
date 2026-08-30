"use client";

import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANY_VALUE,
  DEFAULT_FILTERS,
  FIXTURE_TODAY,
  LOCATION_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  isValidRange,
} from "@/features/portal/lib/catalogue-options";
import type { CatalogueFilters } from "@/features/portal/lib/types";

export const CatalogueFilterBar = ({
  filters,
  onApply,
  isFetching,
}: {
  filters: CatalogueFilters;
  onApply: (next: CatalogueFilters) => void;
  isFetching: boolean;
}) => {
  const [draft, setDraft] = useState<CatalogueFilters>(filters);

  const rangeValid = isValidRange(draft.startDate, draft.endDate);

  const handleChange = (patch: Partial<CatalogueFilters>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rangeValid) return;
    onApply(draft);
  };

  const handleReset = () => {
    setDraft(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card ring-foreground/10 shadow-card flex flex-col gap-4 rounded-xl p-4 ring-1"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <SlidersHorizontal className="text-primary size-4" />
        Choose your campaign dates
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <DatePicker
            id="startDate"
            min={FIXTURE_TODAY}
            value={draft.startDate}
            onChange={(startDate) => handleChange({ startDate })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">End date</Label>
          <DatePicker
            id="endDate"
            min={draft.startDate || FIXTURE_TODAY}
            value={draft.endDate}
            onChange={(endDate) => handleChange({ endDate })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mediaType">Media type</Label>
          <Select
            value={draft.mediaType || ANY_VALUE}
            onValueChange={(value) =>
              handleChange({ mediaType: value === ANY_VALUE ? "" : value })
            }
          >
            <SelectTrigger id="mediaType" className="w-full">
              <SelectValue placeholder="Any media type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any media type</SelectItem>
              {MEDIA_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locationId">Location</Label>
          <Select
            value={draft.locationId || ANY_VALUE}
            onValueChange={(value) =>
              handleChange({ locationId: value === ANY_VALUE ? "" : value })
            }
          >
            <SelectTrigger id="locationId" className="w-full">
              <SelectValue placeholder="Any location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any location</SelectItem>
              {LOCATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxMonthlyBudget">Max monthly budget (£)</Label>
          <Input
            id="maxMonthlyBudget"
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            placeholder="No limit"
            value={draft.maxMonthlyBudget}
            onChange={(event) => handleChange({ maxMonthlyBudget: event.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          Dates are half-open: the end date is the first day you are no longer on site.
          Budget filtering hides products priced on request.
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={isFetching}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button type="submit" size="sm" disabled={!rangeValid || isFetching}>
            {isFetching ? "Checking availability" : "Apply filters"}
          </Button>
        </div>
      </div>

      {!rangeValid && (
        <p role="alert" className="text-stop-foreground text-sm">
          The start date must be strictly before the end date.
        </p>
      )}
    </form>
  );
};
