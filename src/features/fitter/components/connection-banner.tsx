"use client";

import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ConnectionBanner = ({
  isOnline,
  pendingCount,
  isWorking,
  onRetryAll,
}: {
  isOnline: boolean;
  pendingCount: number;
  isWorking: boolean;
  onRetryAll: () => void;
}) => {
  if (isOnline && pendingCount === 0) return null;

  const tone = isOnline
    ? "border-warn/25 bg-warn-surface text-warn-foreground"
    : "border-stop/25 bg-stop-surface text-stop-foreground";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-3 border-b px-4 py-2.5 text-sm", tone)}
    >
      {isOnline ? (
        <CloudOff className="size-4 shrink-0" />
      ) : (
        <WifiOff className="size-4 shrink-0" />
      )}
      <p className="flex-1 leading-snug">
        {isOnline
          ? `${pendingCount} proof upload${pendingCount === 1 ? "" : "s"} waiting to send.`
          : `Offline. ${pendingCount > 0 ? `${pendingCount} upload${pendingCount === 1 ? "" : "s"} saved on this device.` : "Work is saved on this device."}`}
      </p>
      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="h-9 shrink-0 px-3"
          disabled={isWorking}
          onClick={onRetryAll}
        >
          <RefreshCw className={cn("size-4", isWorking && "animate-spin")} />
          Retry all
        </Button>
      )}
    </div>
  );
};
