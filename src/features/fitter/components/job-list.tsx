"use client";

import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/features/fitter/components/job-card";
import { SignalToggle } from "@/features/fitter/components/signal-toggle";
import { useProofQueue } from "@/features/fitter/hooks/use-proof-queue";
import { useWorkOrders } from "@/features/fitter/hooks/use-work-orders";
import { isToday, isUpcoming } from "@/lib/format";
import { FIXTURE_CLOCK_DATE } from "@/lib/constants";
import type { FitterWorkOrder } from "@/features/fitter/lib/types";
import { PageTitle, SubsectionLabel } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";

const clockLabel = FIXTURE_CLOCK_DATE.toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const Section = ({
  title,
  hint,
  workOrders,
  showDate,
  pendingFor,
  emptyMessage,
}: {
  title: string;
  hint?: string;
  workOrders: FitterWorkOrder[];
  showDate?: boolean;
  pendingFor: (workOrderId: string) => number;
  emptyMessage: string;
}) => (
  <section className="flex flex-col gap-2.5">
    <div className="flex items-baseline justify-between gap-2">
      <SubsectionLabel as="h2">{title}</SubsectionLabel>
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
    </div>
    {workOrders.length === 0 ? (
      <p className="border-border text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
        {emptyMessage}
      </p>
    ) : (
      workOrders.map((workOrder) => (
        <JobCard
          key={workOrder.id}
          workOrder={workOrder}
          showDate={showDate}
          pendingUploads={pendingFor(workOrder.id)}
        />
      ))
    )}
  </section>
);

export const JobList = () => {
  const { data, isPending, isError, error, refetch } = useWorkOrders();
  const { allPending } = useProofQueue();

  const handleRetry = () => {
    void refetch();
  };

  const pendingFor = (workOrderId: string) =>
    allPending.filter((item) => item.workOrderId === workOrderId).length;

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <LoadingState label="Loading your jobs" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load your jobs"
        message={error.message}
        onRetry={handleRetry}
      />
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="No jobs assigned"
        message="Nothing is on your schedule right now. New work orders appear here as soon as a manager assigns them."
      />
    );
  }

  const today = items.filter((item) => isToday(item.scheduledStart));
  const upcoming = items.filter((item) => isUpcoming(item.scheduledStart));
  const earlier = items.filter(
    (item) => !isToday(item.scheduledStart) && !isUpcoming(item.scheduledStart)
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <PageTitle>My jobs</PageTitle>
        <p className="text-muted-foreground text-sm">{clockLabel}</p>
      </header>

      <Section
        title="Today"
        hint={`${today.length} job${today.length === 1 ? "" : "s"}`}
        workOrders={today}
        pendingFor={pendingFor}
        emptyMessage="Nothing scheduled for today."
      />

      <Section
        title="Upcoming"
        hint={`${upcoming.length} job${upcoming.length === 1 ? "" : "s"}`}
        workOrders={upcoming}
        showDate
        pendingFor={pendingFor}
        emptyMessage="No future jobs scheduled."
      />

      {earlier.length > 0 && (
        <Section
          title="Earlier"
          hint="Needs closing out"
          workOrders={earlier}
          showDate
          pendingFor={pendingFor}
          emptyMessage="Nothing outstanding."
        />
      )}

      <Card>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Reviewer tools</p>
          <p className="text-muted-foreground text-xs">
            Forces the proof upload to fail with a 503 so the retry queue can be
            demonstrated on demand.
          </p>
          <SignalToggle />
              </CardContent>
      </Card>
    </div>
  );
};
