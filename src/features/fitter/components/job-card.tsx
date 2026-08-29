"use client";

import Link from "next/link";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate, formatTime } from "@/features/fitter/lib/format";
import type { FitterWorkOrder } from "@/features/fitter/lib/types";

export const JobCard = ({
  workOrder,
  showDate,
  pendingUploads,
}: {
  workOrder: FitterWorkOrder;
  showDate?: boolean;
  pendingUploads: number;
}) => (
  <Link
    href={`/fitter/jobs/${workOrder.id}`}
    className="flex min-h-[88px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors active:bg-muted"
  >
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={workOrder.status} />
        <span className="text-xs text-muted-foreground capitalize">
          {workOrder.type}
        </span>
        {pendingUploads > 0 && (
          <StatusPill
            status={`${pendingUploads} upload queued`}
            tone="warn"
            className="normal-case"
          />
        )}
      </div>
      <p className="truncate text-base font-semibold">{workOrder.assetName}</p>
      <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
        <MapPin className="size-3.5 shrink-0" />
        {workOrder.locationLabel}
      </p>
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Clock className="size-3.5 shrink-0 text-muted-foreground" />
        {showDate && `${formatDate(workOrder.scheduledStart)} · `}
        {formatTime(workOrder.scheduledStart)}–
        {formatTime(workOrder.scheduledEnd)}
      </p>
    </div>
    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
  </Link>
);
