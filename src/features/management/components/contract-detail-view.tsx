"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Callout, EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoryTimeline } from "@/features/management/components/history-timeline";
import {
  asApiError,
  useIssueContract,
} from "@/features/management/hooks/use-management-actions";
import { useContract } from "@/features/management/hooks/use-management-data";
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatMoney,
} from "@/features/management/lib/format";

const issuableStatuses = ["draft", "change_requested"];

export const ContractDetailView = ({ contractId }: { contractId: string }) => {
  const { data, isPending, isError, error, refetch } = useContract(contractId);
  const issueContract = useIssueContract(contractId);
  const issueError = asApiError(issueContract.error);

  if (isPending) return <LoadingState label="Loading the contract" />;

  if (isError) {
    return (
      <ErrorState
        title="This contract could not be loaded"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  const canIssue = issuableStatuses.includes(data.status);
  const pendingClientRequests = data.clientRequests.filter(
    (request) => request.status === "submitted"
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="w-fit gap-1.5 px-2">
          <Link href="/management">
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {data.organisationName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.id} · version {data.version} ·{" "}
              {formatDateRange(data.startDate, data.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={data.status} />
            <span className="font-heading text-xl font-semibold tabular-nums">
              {formatMoney(data.total, data.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Issue to client
            </h2>
            <p className="text-sm text-muted-foreground">
              {canIssue
                ? data.status === "change_requested"
                  ? "Reissuing bumps the contract to the next version and notifies the client."
                  : "Issuing makes this draft visible to the client for acceptance."
                : `A contract in '${data.status}' status cannot be issued.`}
            </p>
          </div>
          <Button
            type="button"
            disabled={!canIssue || issueContract.isPending}
            onClick={() => issueContract.mutate()}
          >
            {issueContract.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {data.status === "change_requested" ? "Reissue to client" : "Issue to client"}
          </Button>
        </div>

        {issueError && (
          <Callout
            tone="stop"
            title={
              issueError.code === "INVALID_TRANSITION"
                ? "Invalid contract transition"
                : `Issue failed (${issueError.code})`
            }
          >
            {issueError.message}
          </Callout>
        )}

        {pendingClientRequests.length > 0 && (
          <Callout tone="warn" title="Client change requests awaiting review">
            <ul className="mt-1 flex flex-col gap-1">
              {pendingClientRequests.map((request, index) => (
                <li key={String(request.id ?? index)} className="text-sm">
                  {String(request.summary ?? request.type ?? "Change requested")}
                  {request.note ? ` — ${String(request.note)}` : ""}
                </li>
              ))}
            </ul>
          </Callout>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Line items
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              {data.items.length === 0 ? (
                <EmptyState title="This contract has no line items" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Asset / pool</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productId}</TableCell>
                        <TableCell>
                          {item.assetId ?? item.capacityPoolId ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.unitRate === null || item.unitRate === undefined
                            ? "Price on request"
                            : `${formatMoney(item.unitRate, data.currency)}${item.rateUnit ? ` / ${item.rateUnit}` : ""}`}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(item.lineTotal, data.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-medium">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoney(data.total, data.currency)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                Work orders
              </h2>
              <Button asChild size="sm" variant="outline">
                <Link href="/management/work-orders/new">New work order</Link>
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              {data.workOrders.length === 0 ? (
                <EmptyState
                  title="No work orders yet"
                  message="Assign a fitter once the client has accepted the contract."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work order</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.workOrders.map((workOrder) => (
                      <TableRow key={workOrder.id}>
                        <TableCell className="font-medium">{workOrder.id}</TableCell>
                        <TableCell>{workOrder.type}</TableCell>
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

        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 font-heading text-lg font-semibold tracking-tight">
              Contract facts
            </h2>
            <dl className="flex flex-col">
              {[
                ["Version", `v${data.version}`],
                ["Status", data.status],
                ["Booking request", data.bookingRequestId ?? "—"],
                ["Campaign", data.campaign ? data.campaign.name : "Not created yet"],
                ["Term", formatDateRange(data.startDate, data.endDate)],
                ["Issued", data.issuedAt ? formatDate(data.issuedAt) : "Not issued"],
                [
                  "Accepted",
                  data.acceptedAt ? formatDate(data.acceptedAt) : "Not accepted",
                ],
                [
                  "Activated",
                  data.activatedAt ? formatDate(data.activatedAt) : "Not active",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0"
                >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
              History
            </h2>
            <HistoryTimeline entries={data.history} />
          </section>
        </div>
      </div>
    </div>
  );
};
