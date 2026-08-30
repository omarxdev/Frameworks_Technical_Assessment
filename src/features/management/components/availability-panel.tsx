"use client";

import { CheckCircle2, CircleAlert, OctagonX } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Callout } from "@/components/ui/states";
import { BlockerList } from "@/features/management/components/blocker-list";
import { formatDateRange, formatMoment as formatDateTime } from "@/lib/format";
import type { AvailabilitySummary } from "@/lib/schemas";
import { SectionTitle, SubsectionLabel } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Icon className={`mt-0.5 size-5 shrink-0 ${meta.iconClass}`} />
            <div>
              <SectionTitle>
                {meta.title}
              </SectionTitle>
              <p className="text-muted-foreground text-sm">
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
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <SubsectionLabel>
                Why it is blocked ({blockers.length}{" "}
                {blockers.length === 1 ? "conflict" : "conflicts"})
              </SubsectionLabel>
              <span className="text-muted-foreground text-xs">
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
                <dt className="text-muted-foreground text-xs">Assets free</dt>
                <dd className="font-medium tabular-nums">
                  {availability.availableAssetCount}
                </dd>
              </div>
            )}
          {availability.availableCapacity !== null &&
            availability.availableCapacity !== undefined && (
              <div>
                <dt className="text-muted-foreground text-xs">Capacity remaining</dt>
                <dd className="font-medium tabular-nums">
                  {availability.availableCapacity}
                  {availability.totalCapacity ? ` / ${availability.totalCapacity}` : ""}
                </dd>
              </div>
            )}
          <div>
            <dt className="text-muted-foreground text-xs">Freshest verification</dt>
            <dd className="font-medium">
              {availability.freshestVerificationAt
                ? formatDateTime(availability.freshestVerificationAt)
                : "Never verified"}
            </dd>
          </div>
        </dl>
          </CardContent>
    </Card>
  );
};
