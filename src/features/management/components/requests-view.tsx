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
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBookingRequests } from "@/features/management/hooks/use-management-data";
import { formatDateRange } from "@/features/management/lib/format";

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "information_required", label: "Information required" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export const RequestsView = () => {
  const [status, setStatus] = useState("all");
  const { data, isPending, isError, error, refetch } = useBookingRequests(status);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Booking requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Non-binding client enquiries awaiting an availability decision.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="request-status-filter" className="text-xs">
            Filter by status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="request-status-filter" className="w-56">
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

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {isPending ? (
          <LoadingState label="Loading booking requests" />
        ) : isError ? (
          <ErrorState
            title="Booking requests could not be loaded"
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : data.items.length === 0 ? (
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
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Requested dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attention</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.organisationName}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {request.id}
                    </span>
                  </TableCell>
                  <TableCell>{request.productName}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateRange(request.startDate, request.endDate)}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={request.status} />
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {request.attentionReason ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link href={`/management/requests/${request.id}`}>
                        Review
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
