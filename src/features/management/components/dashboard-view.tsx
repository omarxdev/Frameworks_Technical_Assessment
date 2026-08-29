"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttentionPanel } from "@/features/management/components/attention-panel";
import { StatTiles } from "@/features/management/components/stat-tiles";
import { useDashboard } from "@/features/management/hooks/use-management-data";
import { formatDateTime } from "@/features/management/lib/format";

export const DashboardView = () => {
  const { data, isPending, isError, error, refetch } = useDashboard();

  if (isPending) return <LoadingState label="Loading the management dashboard" />;

  if (isError) {
    return (
      <ErrorState
        title="The dashboard could not be loaded"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  const upcoming = [...data.upcomingWorkOrders].sort((a, b) =>
    a.scheduledStart.localeCompare(b.scheduledStart)
  );

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Needs attention
            </h1>
            <p className="text-sm text-muted-foreground">
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
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Pipeline at a glance
        </h2>
        <StatTiles counts={data.counts} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Upcoming work orders
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/management/work-orders">Open work orders</Link>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          {upcoming.length === 0 ? (
            <EmptyState
              title="No work orders scheduled"
              message="Create a work order once a contract has been accepted."
              action={
                <Button asChild size="sm">
                  <Link href="/management/work-orders/new">New work order</Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((workOrder) => (
                  <TableRow key={workOrder.id}>
                    <TableCell className="font-medium">{workOrder.id}</TableCell>
                    <TableCell>{workOrder.type}</TableCell>
                    <TableCell>{workOrder.locationLabel}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(workOrder.scheduledStart)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={workOrder.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
};
