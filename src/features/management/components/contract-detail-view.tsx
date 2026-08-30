"use client";

import Link from "next/link";
import { ArrowLeft, CircleCheckBig, Loader2, Send } from "lucide-react";
import { ManagementErrorState } from "@/features/management/components/management-states";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable } from "@/components/shared/data-table";
import { Callout, EmptyState, LoadingState } from "@/components/ui/states";
import { ProofGallery } from "@/components/shared/proof-gallery";
import { ClientRequestPanel } from "@/features/management/components/client-request-panel";
import { Timeline, historyItems } from "@/components/shared/timeline";
import {
  asApiError,
  useCompleteContract,
  useIssueContract,
} from "@/features/management/hooks/use-management-actions";
import { useContract } from "@/features/management/hooks/use-management-data";
import { PageTitle, SectionTitle } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";
import { DetailRow } from "@/components/shared/detail-row";
import { MetricValue } from "@/components/ui/metric";
import {
  formatDateRange,
  formatDay as formatDate,
  formatMoment as formatDateTime,
  formatMoney,
} from "@/lib/format";

const issuableStatuses = ["draft", "change_requested"];

export const ContractDetailView = ({ contractId }: { contractId: string }) => {
  const { data, isPending, isError, error, refetch } = useContract(contractId);
  const issueContract = useIssueContract(contractId);
  const issueError = asApiError(issueContract.error);
  const completeContract = useCompleteContract(contractId);
  const completeError = asApiError(completeContract.error);

  if (isPending) return <LoadingState label="Loading the contract" />;

  if (isError) {
    return (
      <ManagementErrorState
        error={error}
        title="This contract could not be loaded"
        fallback="The contract could not be loaded."
        onRetry={() => refetch()}
      />
    );
  }

  const canIssue = issuableStatuses.includes(data.status);
  const canComplete = data.status === "active";
  const openWorkOrders = data.workOrders.filter(
    (workOrder) => workOrder.status !== "completed"
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="w-fit">
          <Link href="/management">
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <PageTitle>
              <Link
                href={`/management/clients/${data.organisationId}`}
                className="underline-offset-4 hover:underline"
              >
                {data.organisationName}
              </Link>
            </PageTitle>
            <p className="text-muted-foreground text-sm">
              {data.id} · version {data.version} ·{" "}
              {formatDateRange(data.startDate, data.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={data.status} />
            <MetricValue>{formatMoney(data.total, data.currency)}</MetricValue>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionTitle>
                Issue to client
              </SectionTitle>
              <p className="text-muted-foreground text-sm">
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
              {data.status === "change_requested"
                ? "Reissue to client"
                : "Issue to client"}
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
              </CardContent>
      </Card>

      <ClientRequestPanel requests={data.clientRequests} contractId={contractId} />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionTitle>
                Close the campaign
              </SectionTitle>
              <p className="text-muted-foreground text-sm">
                {!canComplete
                  ? `A contract in '${data.status}' status cannot be completed.`
                  : openWorkOrders > 0
                    ? `${openWorkOrders} work order${openWorkOrders === 1 ? "" : "s"} still open. Close them before completing the campaign.`
                    : "Marks the campaign delivered, closes the contract and tells the client."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!canComplete || openWorkOrders > 0 || completeContract.isPending}
              onClick={() => completeContract.mutate(undefined)}
            >
              {completeContract.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CircleCheckBig className="size-4" />
              )}
              Complete contract
            </Button>
          </div>

          {completeError && (
            <Callout tone="stop" title={`Completion failed (${completeError.code})`}>
              {completeError.message}
            </Callout>
          )}
              </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-detail">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <SectionTitle>
              Line items
            </SectionTitle>
            {data.items.length === 0 ? (
              <Card>
                <EmptyState title="This contract has no line items" />
              </Card>
            ) : (
              <DataTable
                rows={data.items}
                rowKey={(item) => item.id}
                footer={{
                  label: "Total",
                  value: formatMoney(data.total, data.currency),
                }}
                columns={[
                  {
                    header: "Product",
                    role: "title",
                    cell: (item) => item.productId,
                  },
                  {
                    header: "Asset / pool",
                    cell: (item) => item.assetId ?? item.capacityPoolId ?? "\u2014",
                  },
                  {
                    header: "Qty",
                    align: "right",
                    className: "tabular-nums",
                    cell: (item) => item.quantity,
                  },
                  {
                    header: "Unit price",
                    align: "right",
                    className: "tabular-nums",
                    cell: (item) =>
                      item.unitRate === null || item.unitRate === undefined
                        ? "Price on request"
                        : `${formatMoney(item.unitRate, data.currency)}${item.rateUnit ? ` / ${item.rateUnit}` : ""}`,
                  },
                  {
                    header: "Line total",
                    align: "right",
                    className: "tabular-nums",
                    cell: (item) => formatMoney(item.lineTotal, data.currency),
                  },
                ]}
              />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle>
                Work orders
              </SectionTitle>
              <Button asChild size="sm" variant="outline">
                <Link href="/management/work-orders/new">New work order</Link>
              </Button>
            </div>
            {data.workOrders.length === 0 ? (
              <Card>
                <EmptyState
                  title="No work orders yet"
                  message="Assign a fitter once the client has accepted the contract."
                />
              </Card>
            ) : (
              <DataTable
                rows={data.workOrders}
                rowKey={(workOrder) => workOrder.id}
                columns={[
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
                  {
                    header: "Scheduled",
                    nowrap: true,
                    cell: (workOrder) => formatDateTime(workOrder.scheduledStart),
                  },
                ]}
              />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>
              Completion proof
            </SectionTitle>
            <ProofGallery
              records={data.proofRecords}
              emptyTitle="No proof captured yet"
              emptyMessage="Photos and completion notes appear here once a fitter closes a job on this contract."
            />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <SectionTitle className="mb-2">
                Contract facts
              </SectionTitle>
              <dl className="flex flex-col">
                {([
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
                ] satisfies [string, React.ReactNode][]).map(([label, value]) => (
                  <DetailRow key={label} label={label} value={value} />
                ))}
              </dl>
                      </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionTitle className="mb-3">
                History
              </SectionTitle>
              <Timeline items={historyItems(data.history)} />
                      </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
