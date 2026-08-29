"use client";

import { CalendarX2, Lock, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateRange } from "@/features/management/lib/format";
import type { AvailabilityBlocker } from "@/features/management/lib/types";

const blockerMeta: Record<
  string,
  { label: string; explanation: string; icon: typeof Lock }
> = {
  booking: {
    label: "Confirmed booking",
    explanation: "Another campaign already owns this asset for these dates.",
    icon: CalendarX2,
  },
  hold: {
    label: "Active hold",
    explanation: "The asset is provisionally reserved and the hold has not expired.",
    icon: Lock,
  },
  outage: {
    label: "Confirmed outage",
    explanation: "The asset is out of service for maintenance or damage.",
    icon: Wrench,
  },
};

export const BlockerList = ({
  blockers,
  className,
}: {
  blockers: AvailabilityBlocker[];
  className?: string;
}) => {
  if (blockers.length === 0) return null;

  return (
    <ol className={cn("flex flex-col gap-2", className)}>
      {blockers.map((blocker, index) => {
        const meta = blockerMeta[blocker.kind] ?? {
          label: blocker.kind,
          explanation: "This record overlaps the requested dates.",
          icon: CalendarX2,
        };
        const Icon = meta.icon;

        return (
          <li
            key={`${blocker.id}-${index}`}
            className="flex gap-3 rounded-lg border border-border bg-background p-3"
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-stop-surface text-stop-foreground">
              <Icon className="size-3.5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-medium">
                {meta.label}
                <span className="ml-2 font-normal text-muted-foreground">
                  {blocker.id}
                </span>
              </p>
              <p className="text-sm break-words text-foreground">{blocker.label}</p>
              <p className="text-xs text-muted-foreground">
                Blocks {formatDateRange(blocker.startDate, blocker.endDate)} ·{" "}
                {meta.explanation}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
