"use client";

import { CalendarClock, ClipboardList, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/ui/status-pill";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { CompletionPanel } from "@/features/fitter/components/completion-panel";
import { HistoryTimeline } from "@/features/fitter/components/history-timeline";
import { ProgressActions } from "@/features/fitter/components/progress-actions";
import { SignalToggle } from "@/features/fitter/components/signal-toggle";
import { useWorkOrder } from "@/features/fitter/hooks/use-work-orders";
import { formatWindow } from "@/features/fitter/lib/format";

export const JobDetail = ({ workOrderId }: { workOrderId: string }) => {
  const { data, isPending, isError, error, refetch } = useWorkOrder(workOrderId);

  const handleRetry = () => {
    void refetch();
  };

  if (isPending) return <LoadingState label="Loading job" />;

  if (isError) {
    return (
      <ErrorState
        title="Could not load this job"
        message={error.message}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <StatusPill status={data.status} className="self-start" />
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {data.assetName}
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          {data.locationLabel}
        </p>
        <p className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
          {formatWindow(data.scheduledStart, data.scheduledEnd)}
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
          <ClipboardList className="size-4" />
          Instructions
        </h2>
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed">
          {data.instructions}
        </p>
      </section>

      <Separator />

      <ProgressActions workOrderId={data.id} status={data.status} />

      <Separator />

      <CompletionPanel workOrder={data} />

      <Separator />

      <HistoryTimeline history={data.history} />

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Reviewer tools</p>
        <p className="text-xs text-muted-foreground">
          Sends x-simulate-upload-failure on the next proof upload so the queue
          and retry path can be demonstrated.
        </p>
        <SignalToggle />
      </div>
    </div>
  );
};
