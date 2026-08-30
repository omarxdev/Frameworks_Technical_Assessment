"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ManagementErrorState } from "@/features/management/components/management-states";
import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { useBookingRequests } from "@/features/management/hooks/use-management-data";
import { formatDateRange } from "@/lib/format";
import { PageTitle } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import type { BookingRequestSummary } from "@/lib/schemas";

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "information_required", label: "Information required" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

const requestColumns: DataColumn<BookingRequestSummary>[] = [
  {
    header: "Organisation",
    role: "title",
    cell: (request) => (
      <>
        {request.organisationName}
        <span className="text-muted-foreground block text-xs font-normal">
          {request.id}
        </span>
      </>
    ),
  },
  {
    header: "Status",
    role: "badge",
    cell: (request) => <StatusPill status={request.status} />,
  },
  { header: "Product", cell: (request) => request.productName },
  {
    header: "Requested dates",
    nowrap: true,
    cell: (request) => formatDateRange(request.startDate, request.endDate),
  },
  {
    header: "Attention",
    className: "text-muted-foreground max-w-xs text-sm",
    cell: (request) => request.attentionReason ?? "\u2014",
  },
  {
    header: "Action",
    role: "action",
    align: "right",
    cell: (request) => (
      <Button asChild size="sm" variant="outline">
        <Link href={`/management/requests/${request.id}`}>
          Review
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    ),
  },
];

export const RequestsView = () => {
  const [status, setStatus] = useState("all");
  const { data, isPending, isError, error, refetch } = useBookingRequests(status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <PageTitle>Booking requests</PageTitle>
          <p className="text-muted-foreground text-sm">
            Non-binding client enquiries awaiting an availability decision.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="request-status-filter" className="text-xs">
            Filter by status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="request-status-filter" className="w-full sm:w-56">
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
      </div>

      {isPending ? (
        <Card>
          <LoadingState label="Loading booking requests" />
        </Card>
      ) : isError ? (
        <Card>
          <ManagementErrorState
            error={error}
            title="Booking requests could not be loaded"
            fallback="Booking requests could not be loaded."
            onRetry={() => refetch()}
          />
        </Card>
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            title="No booking requests match this filter"
            message={
              status === "all"
                ? "New client enquiries will land here as soon as they are submitted."
                : "Try clearing the status filter to see every request."
            }
            action={
              status === "all" ? undefined : (
                <Button size="sm" variant="outline" onClick={() => setStatus("all")}>
                  Clear filter
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <DataTable
          rows={data.items}
          rowKey={(request) => request.id}
          columns={requestColumns}
        />
      )}
    </div>
  );
};
