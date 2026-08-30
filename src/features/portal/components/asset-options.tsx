"use client";

import { CalendarClock, CircleSlash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill, humanise } from "@/components/ui/status-pill";
import { formatDateRange, formatDay as formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssetOption, AvailabilityBlocker } from "@/lib/schemas";
import { Callout } from "@/components/ui/states";

const blockerIcons = {
  booking: CalendarClock,
  hold: ShieldAlert,
  outage: CircleSlash2,
};

const blockerHeadings = {
  booking: "Already booked",
  hold: "Held for another advertiser",
  outage: "Out of service",
};

const BlockerRow = ({ blocker }: { blocker: AvailabilityBlocker }) => {
  const Icon = blockerIcons[blocker.kind];

  return (
    <li>
      <Callout tone="stop" size="sm" className="flex gap-2.5">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <span className="flex flex-col gap-0.5 text-sm">
          <span className="font-medium">{blockerHeadings[blocker.kind]}</span>
          <span>{blocker.label}</span>
          <span className="text-xs opacity-80">
            Clashes with {formatDateRange(blocker.startDate, blocker.endDate)}
          </span>
        </span>
      </Callout>
    </li>
  );
};

export const AssetOptionList = ({
  assets,
  selectedAssetId,
  onSelect,
}: {
  assets: AssetOption[];
  selectedAssetId: string;
  onSelect: (assetId: string) => void;
}) => (
  <ul className="flex flex-col gap-3">
    {assets.map((asset) => {
      const blockers = asset.availability.blockers ?? [];
      const selectable = asset.availability.state !== "unavailable";
      const selected = selectedAssetId === asset.id;

      return (
        <li
          key={asset.id}
          className={cn(
            "flex flex-col gap-3 rounded-xl border p-4",
            selected ? "border-primary bg-accent/40" : "border-border bg-card"
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">{asset.name}</p>
              <p className="text-muted-foreground text-xs">
                {asset.id} · Last verified {formatDate(asset.verifiedAt)}
              </p>
            </div>
            <StatusPill status={asset.availability.state} />
          </div>

          <p className="text-muted-foreground text-sm">{asset.availability.reason}</p>

          {blockers.length > 0 && (
            <ul className="flex flex-col gap-2">
              {blockers.map((blocker) => (
                <BlockerRow key={blocker.id} blocker={blocker} />
              ))}
            </ul>
          )}

          {blockers.length === 0 && asset.availability.verificationStale && (
            <Callout tone="warn" size="sm">
              Free for your dates, but our verification is more than 30 days old. We
              will re-confirm with the media owner before any contract is issued — it is
              a caution, not a refusal.
            </Callout>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              disabled={!selectable}
              onClick={() => onSelect(selected ? "" : asset.id)}
            >
              {selected
                ? "Preferred asset"
                : selectable
                  ? "Prefer this asset"
                  : humanise(asset.availability.state)}
            </Button>
            {!selectable && (
              <span className="text-muted-foreground text-xs">
                You can still enquire — we will suggest an alternative.
              </span>
            )}
          </div>
        </li>
      );
    })}
  </ul>
);
