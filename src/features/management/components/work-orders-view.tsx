"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Plus } from "lucide-react";
import { ProofGallery } from "@/components/shared/proof-gallery";
import { ManagementErrorState } from "@/features/management/components/management-states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { Callout, EmptyState, LoadingState } from "@/components/ui/states";
import { useWorkOrders } from "@/features/management/hooks/use-management-data";
import { formatMoment as formatDateTime } from "@/lib/format";
import { PageTitle } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "assigned", label: "Assigned" },
  { value: "travelling", label: "Travelling" },
  { value: "on_site", label: "On site" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

export const WorkOrdersView = () => {
  const [status, setStatus] = useState("all");
  const { data, isPending, isError, error, refetch } = useWorkOrders(status);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <PageTitle>
            Work orders
          </PageTitle>
          <p className="text-muted-foreground text-sm">
            Every field job, who owns it, and the proof captured on completion.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
            <Label htmlFor="work-order-status-filter" className="text-xs">
              Filter by status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="work-order-status-filter" className="w-full sm:w-52">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild>
            <Link href="/management/work-orders/new">
              <Plus className="size-4" />
              New work order
            </Link>
          </Button>
        </div>
      </div>

      {isPending ? (
        <Card>
          <LoadingState label="Loading work orders" />
        </Card>
      ) : isError ? (
        <Card>
          <ManagementErrorState
            error={error}
            title="Work orders could not be loaded"
            fallback="Work orders could not be loaded."
            onRetry={() => refetch()}
          />
        </Card>
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            title="No work orders match this filter"
            message="Assign a fitter to an accepted contract to create the first job."
            action={
              <Button asChild size="sm">
                <Link href="/management/work-orders/new">New work order</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {data.items.map((workOrder) => {
            const blockedEntry = [...workOrder.history]
              .reverse()
              .find((entry) => entry.action === "blocked");

            return (
              <li key={workOrder.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/management/work-orders/${workOrder.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {workOrder.locationLabel}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {workOrder.id} · {workOrder.type} · {workOrder.assetName}
                        </p>
                      </div>
                      <StatusPill status={workOrder.status} />
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground text-xs">Assigned fitter</dt>
                        <dd className="font-medium">{workOrder.assignedUserName}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">Contract</dt>
                        <dd className="font-medium">
                          <Link
                            href={`/management/contracts/${workOrder.contractId}`}
                            className="underline underline-offset-4"
                          >
                            {workOrder.contractId}
                          </Link>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">Scheduled start</dt>
                        <dd className="font-medium">
                          {formatDateTime(workOrder.scheduledStart)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">Scheduled end</dt>
                        <dd className="font-medium">
                          {formatDateTime(workOrder.scheduledEnd)}
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <p className="text-muted-foreground text-xs">Instructions</p>
                      <p className="text-sm">{workOrder.instructions}</p>
                    </div>

                    {workOrder.internalNotes && (
                      <div className="border-border bg-muted/50 rounded-lg border p-3">
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase">
                          <EyeOff className="size-4" />
                          Internal only — never shown to the client or the fitter
                        </p>
                        <p className="mt-1 text-sm">{workOrder.internalNotes}</p>
                      </div>
                    )}

                    {workOrder.status === "blocked" && (
                      <Callout tone="stop" title="Blocked on site">
                        {blockedEntry?.note ?? "No reason was recorded."}
                      </Callout>
                    )}

                    {workOrder.status === "completed" && (
                      <Callout tone="ok" size="sm" subtle className="flex flex-col gap-2">
                        <p className="text-ok-foreground text-xs font-semibold uppercase">
                          Completed
                        </p>
                        <p className="text-sm">
                          {workOrder.completionNote ?? "No completion note recorded."}
                        </p>
                        <ProofGallery
                          records={workOrder.proofRecords}
                          emptyTitle="No proof records attached"
                          emptyMessage="This job was closed without a photo on file."
                          columns={1}
                        />
                      </Callout>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
