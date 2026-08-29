"use client";

import { CheckCircle2, CircleAlert, OctagonX } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Callout } from "@/components/ui/states";
import { BlockerList } from "@/features/management/components/blocker-list";
import { formatDateRange, formatDateTime } from "@/features/management/lib/format";
import type { AvailabilitySummary } from "@/lib/schemas";

interface HeadlineMeta {
  title: string;
  icon: typeof CheckCircle2;
  iconClass: string;
}

const blockedHeadline: HeadlineMeta = {
  title: "Cannot be allocated for these dates",
  icon: OctagonX,
  iconClass: "text-stop",
};

const headline: Record<string, HeadlineMeta> = {
  available: {
    title: "Inventory is free for these dates",
    icon: CheckCircle2,
    iconClass: "text-ok",
  },
  confirmation_required: {
    title: "Free, but verification is stale",
    icon: CircleAlert,
    iconClass: "text-warn",
  },
  unavailable: blockedHeadline,
};

export const AvailabilityPanel = ({
  availability,
  startDate,
  endDate,
}: {
  availability: AvailabilitySummary;
  startDate: string;
  endDate: string;
}) => {
  const meta = headline[availability.state] ?? blockedHeadline;
  const Icon = meta.icon;
  const blockers = availability.blockers ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 size-5 shrink-0 ${meta.iconClass}`} />
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              {meta.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              Live recheck for {formatDateRange(startDate, endDate)}
            </p>
          </div>
        </div>
        <StatusPill status={availability.state} />
      </div>

      <p className="text-sm">{availability.reason}</p>

      {availability.state === "confirmation_required" && (
        <Callout tone="warn" title="Verify before approving">
          The asset is free, but its last verification with the media owner is more than
          30 days old
          {availability.freshestVerificationAt
            ? ` (last verified ${formatDateTime(availability.freshestVerificationAt)})`
            : ""}
          . Confirm the asset is still in place before you approve — this is a caution,
          not a hard block.
        </Callout>
      )}

      {blockers.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Why it is blocked ({blockers.length}{" "}
              {blockers.length === 1 ? "conflict" : "conflicts"})
            </h3>
            <span className="text-xs text-muted-foreground">
              Calculated {formatDateTime(availability.calculatedAt)}
            </span>
          </div>
          <BlockerList blockers={blockers} />
        </div>
      )}

      {availability.state === "unavailable" && blockers.length === 0 && (
        <Callout tone="stop" title="No allocatable inventory">
          {availability.reason}
        </Callout>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        {availability.availableAssetCount !== null &&
          availability.availableAssetCount !== undefined && (
            <div>
              <dt className="text-xs text-muted-foreground">Assets free</dt>
              <dd className="font-medium tabular-nums">
                {availability.availableAssetCount}
              </dd>
            </div>
          )}
        {availability.availableCapacity !== null &&
          availability.availableCapacity !== undefined && (
            <div>
              <dt className="text-xs text-muted-foreground">Capacity remaining</dt>
              <dd className="font-medium tabular-nums">
                {availability.availableCapacity}
                {availability.totalCapacity ? ` / ${availability.totalCapacity}` : ""}
              </dd>
            </div>
          )}
        <div>
          <dt className="text-xs text-muted-foreground">Freshest verification</dt>
          <dd className="font-medium">
            {availability.freshestVerificationAt
              ? formatDateTime(availability.freshestVerificationAt)
              : "Never verified"}
          </dd>
        </div>
      </dl>
    </div>
  );
};
