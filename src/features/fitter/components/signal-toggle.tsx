"use client";

import { SignalHigh, SignalLow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignalStore } from "@/features/fitter/store/use-signal-store";
import { cn } from "@/lib/utils";

export const SignalToggle = ({ className }: { className?: string }) => {
  const simulatePoorSignal = useSignalStore((state) => state.simulatePoorSignal);
  const toggleSimulatePoorSignal = useSignalStore(
    (state) => state.toggleSimulatePoorSignal
  );

  const handleToggle = () => toggleSimulatePoorSignal();

  return (
    <Button
      type="button"
      variant="outline"
      size="touch"
      role="switch"
      aria-checked={simulatePoorSignal}
      onClick={handleToggle}
      className={cn(
        "w-full justify-between text-left",
        simulatePoorSignal &&
          "border-warn/25 bg-warn-surface text-warn-foreground hover:bg-warn-surface",
        className
      )}
    >
      <span className="flex items-center gap-2">
        {simulatePoorSignal ? (
          <SignalLow className="size-4" />
        ) : (
          <SignalHigh className="size-4" />
        )}
        Simulate poor signal
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
          simulatePoorSignal
            ? "bg-warn-surface text-warn-foreground ring-warn/25"
            : "bg-muted text-muted-foreground ring-border"
        )}
      >
        {simulatePoorSignal ? "On" : "Off"}
      </span>
    </Button>
  );
};
