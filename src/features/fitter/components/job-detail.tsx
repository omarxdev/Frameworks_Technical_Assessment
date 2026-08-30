"use client";

import { CalendarClock, ClipboardList, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/ui/status-pill";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { CompletionPanel } from "@/features/fitter/components/completion-panel";
import { Timeline, historyItems } from "@/components/shared/timeline";
import { ProgressActions } from "@/features/fitter/components/progress-actions";
import { SignalToggle } from "@/features/fitter/components/signal-toggle";
import { useWorkOrder } from "@/features/fitter/hooks/use-work-orders";
import { formatJobWindow as formatWindow } from "@/lib/format";
import { PageTitle, SubsectionLabel } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";

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
        <PageTitle>
          {data.assetName}
        </PageTitle>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <MapPin className="size-4 shrink-0" />
          {data.locationLabel}
        </p>
        <p className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="text-muted-foreground size-4 shrink-0" />
          {formatWindow(data.scheduledStart, data.scheduledEnd)}
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <SubsectionLabel as="h2">
          <ClipboardList className="size-4" />
          Instructions
        </SubsectionLabel>
        <p className="bg-card ring-foreground/10 shadow-card rounded-xl px-4 py-3 text-sm leading-relaxed ring-1">
          {data.instructions}
        </p>
      </section>

      <Separator />

      <ProgressActions workOrderId={data.id} status={data.status} />

      <Separator />

      <CompletionPanel workOrder={data} />

      <Separator />

      <section className="flex flex-col gap-2.5">
        <SubsectionLabel>History</SubsectionLabel>
        <Timeline
          items={historyItems(data.history)}
          emptyTitle="Nothing recorded yet"
          emptyMessage="Progress updates and completion notes appear here."
        />
      </section>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Reviewer tools</p>
          <p className="text-muted-foreground text-xs">
            Sends x-simulate-upload-failure on the next proof upload so the queue and
            retry path can be demonstrated.
          </p>
          <SignalToggle />
              </CardContent>
      </Card>
    </div>
  );
};
