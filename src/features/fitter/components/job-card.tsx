"use client";

import Link from "next/link";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatTime, formatWeekday as formatDate } from "@/lib/format";
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
    className="bg-card ring-foreground/10 active:bg-muted focus-visible:ring-ring flex min-h-tap-card items-center gap-3 rounded-xl px-4 py-4 text-left ring-1 transition-colors outline-none focus-visible:ring-2"
  >
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={workOrder.status} />
        <span className="text-muted-foreground text-xs capitalize">
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
      <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
        <MapPin className="size-4 shrink-0" />
        {workOrder.locationLabel}
      </p>
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Clock className="text-muted-foreground size-4 shrink-0" />
        {showDate && `${formatDate(workOrder.scheduledStart)} · `}
        {formatTime(workOrder.scheduledStart)}–{formatTime(workOrder.scheduledEnd)}
      </p>
    </div>
    <ChevronRight className="text-muted-foreground size-5 shrink-0" />
  </Link>
);
