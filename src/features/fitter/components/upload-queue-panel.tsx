"use client";

import { CloudUpload, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatMoment as formatDateTime } from "@/lib/format";
import type { QueuedUpload } from "@/stores/use-upload-queue-store";
import { cn } from "@/lib/utils";
import { SubsectionLabel } from "@/components/ui/typography";

const toneForQueueStatus = (status: QueuedUpload["status"]) => {
  if (status === "failed") return "stop" as const;
  if (status === "uploading") return "info" as const;
  if (status === "uploaded") return "ok" as const;
  return "warn" as const;
};

export const UploadQueuePanel = ({
  items,
  isOnline,
  onRetry,
  onDiscard,
}: {
  items: QueuedUpload[];
  isOnline: boolean;
  onRetry: (item: QueuedUpload) => void;
  onDiscard: (id: string) => void;
}) => {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <SubsectionLabel>
        <CloudUpload className="size-4" />
        Waiting to upload ({items.length})
      </SubsectionLabel>

      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex flex-col gap-2 rounded-xl border px-4 py-3",
            item.status === "failed"
              ? "border-stop/25 bg-stop-surface"
              : "border-border bg-card"
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {item.fileName}
            </p>
            <StatusPill status={item.status} tone={toneForQueueStatus(item.status)} />
          </div>

          <p className="text-muted-foreground text-xs">
            Queued {formatDateTime(item.queuedAt)} · {item.attempts} attempt
            {item.attempts === 1 ? "" : "s"}
          </p>

          {item.lastError && (
            <p role="alert" className="text-stop-foreground text-xs">
              {item.lastError}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="touch" className="flex-1"
              disabled={item.status === "uploading" || !isOnline}
              onClick={() => onRetry(item)}
            >
              {item.status === "uploading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Retry
            </Button>
            <Button
              variant="ghost"
              size="touch"
              aria-label={`Discard ${item.fileName}`}
              disabled={item.status === "uploading"}
              onClick={() => onDiscard(item.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
};
