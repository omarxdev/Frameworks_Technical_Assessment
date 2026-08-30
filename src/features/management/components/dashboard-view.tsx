"use client";

import Link from "next/link";
import { ManagementErrorState } from "@/features/management/components/management-states";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, type DataColumn } from "@/components/shared/data-table";
import type { WorkOrder } from "@/lib/schemas";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { AttentionPanel } from "@/features/management/components/attention-panel";
import { StatTiles } from "@/features/management/components/stat-tiles";
import { useDashboard } from "@/features/management/hooks/use-management-data";
import { formatMoment as formatDateTime } from "@/lib/format";
import { PageTitle, SectionTitle } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";

const upcomingColumns: DataColumn<WorkOrder>[] = [
  {
    header: "Work order",
    role: "title",
    cell: (workOrder) => (
      <Link
        href={`/management/work-orders/${workOrder.id}`}
        className="underline-offset-4 hover:underline"
      >
        {workOrder.id}
      </Link>
    ),
  },
  {
    header: "Status",
    role: "badge",
    cell: (workOrder) => <StatusPill status={workOrder.status} />,
  },
  { header: "Type", cell: (workOrder) => workOrder.type },
  { header: "Location", cell: (workOrder) => workOrder.locationLabel },
  {
    header: "Scheduled",
    nowrap: true,
    cell: (workOrder) => formatDateTime(workOrder.scheduledStart),
  },
];

export const DashboardView = () => {
  const { data, isPending, isError, error, refetch } = useDashboard();

  if (isPending) return <LoadingState label="Loading the management dashboard" />;

  if (isError) {
    return (
      <ManagementErrorState
        error={error}
        title="The dashboard could not be loaded"
        fallback="The management dashboard could not be loaded."
        onRetry={() => refetch()}
      />
    );
  }

  const upcoming = [...data.upcomingWorkOrders].sort((a, b) =>
    a.scheduledStart.localeCompare(b.scheduledStart)
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <PageTitle>
              Needs attention
            </PageTitle>
            <p className="text-muted-foreground text-sm">
              Sorted by priority. Work through urgent items before anything else.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/management/requests">All booking requests</Link>
          </Button>
        </div>
        <AttentionPanel items={data.attentionItems} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>
          Pipeline at a glance
        </SectionTitle>
        <StatTiles counts={data.counts} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>
            Upcoming work orders
          </SectionTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/management/work-orders">Open work orders</Link>
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <Card>
            <EmptyState
              title="No work orders scheduled"
              message="Create a work order once a contract has been accepted."
              action={
                <Button asChild size="sm">
                  <Link href="/management/work-orders/new">New work order</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <DataTable
            rows={upcoming}
            rowKey={(workOrder) => workOrder.id}
            columns={upcomingColumns}
          />
        )}
      </section>
    </div>
  );
};
