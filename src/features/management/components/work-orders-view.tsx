"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EyeOff, FileImage, Plus } from "lucide-react";
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
import { Callout, EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useWorkOrders } from "@/features/management/hooks/use-management-data";
import { formatDateTime } from "@/features/management/lib/format";
import { cn } from "@/lib/utils";

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
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const [status, setStatus] = useState("all");
  const { data, isPending, isError, error, refetch } = useWorkOrders(status);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Work orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Every field job, who owns it, and the proof captured on completion.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="work-order-status-filter" className="text-xs">
              Filter by status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="work-order-status-filter" className="w-52">
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
        <div className="rounded-xl border border-border bg-card">
          <LoadingState label="Loading work orders" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card">
          <ErrorState
            title="Work orders could not be loaded"
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            title="No work orders match this filter"
            message="Assign a fitter to an accepted contract to create the first job."
            action={
              <Button asChild size="sm">
                <Link href="/management/work-orders/new">New work order</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {data.items.map((workOrder) => {
            const blockedEntry = [...workOrder.history]
              .reverse()
              .find((entry) => entry.action === "blocked");

            return (
              <li
                key={workOrder.id}
                className={cn(
                  "flex flex-col gap-4 rounded-xl border bg-card p-5",
                  focusId === workOrder.id
                    ? "border-warn ring-2 ring-warn/30"
                    : "border-border"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{workOrder.locationLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {workOrder.id} · {workOrder.type} · {workOrder.assetName}
                    </p>
                  </div>
                  <StatusPill status={workOrder.status} />
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Assigned fitter</dt>
                    <dd className="font-medium">{workOrder.assignedUserName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Contract</dt>
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
                    <dt className="text-xs text-muted-foreground">Scheduled start</dt>
                    <dd className="font-medium">
                      {formatDateTime(workOrder.scheduledStart)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Scheduled end</dt>
                    <dd className="font-medium">
                      {formatDateTime(workOrder.scheduledEnd)}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs text-muted-foreground">Instructions</p>
                  <p className="text-sm">{workOrder.instructions}</p>
                </div>

                {workOrder.internalNotes && (
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      <EyeOff className="size-3.5" />
                      Internal only — never shown to the client
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
                  <div className="flex flex-col gap-2 rounded-lg border border-ok/30 bg-ok-surface/40 p-3">
                    <p className="text-xs font-semibold text-ok-foreground uppercase">
                      Completed
                    </p>
                    <p className="text-sm">
                      {workOrder.completionNote ?? "No completion note recorded."}
                    </p>
                    {workOrder.proofRecords.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No proof records attached.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {workOrder.proofRecords.map((proof) => (
                          <li
                            key={proof.id}
                            className="flex items-center gap-2 text-sm break-all"
                          >
                            <FileImage className="size-3.5 shrink-0" />
                            <span>{proof.fileName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(proof.createdAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
