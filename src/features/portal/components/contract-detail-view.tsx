"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Callout, EmptyState, LoadingState } from "@/components/ui/states";
import { StatusPill, humanise } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContractActions } from "@/features/portal/components/contract-actions";
import { PortalErrorState } from "@/features/portal/components/portal-states";
import {
  HistoryTimeline,
  ServiceEventTimeline,
} from "@/features/portal/components/timelines";
import { useContractDetail } from "@/features/portal/hooks/use-portal-data";
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatMoney,
  humaniseKey,
} from "@/features/portal/lib/format";
import type {
  PortalClientRequest,
  PortalContractDetail,
} from "@/features/portal/lib/types";
import type { ProofRecord } from "@/lib/schemas";

const PendingRequests = ({
  requests,
}: {
  requests: PortalClientRequest[];
}) => {
  const pending = (requests ?? []).filter(
    (request) => request.status === "submitted"
  );

  if (pending.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {pending.map((request) => (
        <Callout
          key={request.id}
          tone="warn"
          title={`${humaniseKey(request.type)} — Submitted, awaiting management review`}
        >
          <p>{request.summary}</p>
          <p className="mt-1 text-xs opacity-80">
            Sent {formatDateTime(request.createdAt)} · reference {request.id}.
            Nothing has been approved or applied yet.
          </p>
        </Callout>
      ))}
    </div>
  );
};

const LineItems = ({ contract }: { contract: PortalContractDetail }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Asset</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit rate</TableHead>
          <TableHead className="text-right">Line total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contract.items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.productId}</TableCell>
            <TableCell className="text-muted-foreground">
              {item.assetId ?? item.capacityPoolId ?? "Allocated on activation"}
            </TableCell>
            <TableCell className="text-right">{item.quantity}</TableCell>
            <TableCell className="text-right">
              {item.unitRate === null || item.unitRate === undefined
                ? "On request"
                : `${formatMoney(item.unitRate)}${item.rateUnit ? ` / ${humanise(item.rateUnit)}` : ""}`}
            </TableCell>
            <TableCell className="text-right">
              {formatMoney(item.lineTotal)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={4} className="text-right font-medium">
            Contract total
          </TableCell>
          <TableCell className="text-right font-heading text-base font-semibold">
            {formatMoney(contract.total)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);

const ProofRecords = ({ records }: { records: ProofRecord[] }) => {
  if (!records || records.length === 0) {
    return (
      <EmptyState
        title="No proof of posting yet"
        message="Once our field team completes the installation, their photos and completion notes appear here."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {records.map((record) => (
        <figure
          key={record.id}
          className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card"
        >
          {record.previewUrl ? (
            <img
              src={record.previewUrl}
              alt={`Installation proof ${record.fileName}`}
              className="h-44 w-full object-cover"
            />
          ) : (
            <div className="flex h-44 w-full items-center justify-center bg-muted text-muted-foreground">
              <FileText className="size-6" />
            </div>
          )}
          <figcaption className="flex flex-col gap-1 px-4 pb-4 text-sm">
            <span className="font-medium">{record.fileName}</span>
            {record.completionNote && (
              <span className="text-muted-foreground">
                {record.completionNote}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Captured {formatDateTime(record.createdAt)}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
};

const ContractContent = ({ contract }: { contract: PortalContractDetail }) => (
  <div className="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="font-heading text-xl">
              {contract.id}
            </CardTitle>
            <CardDescription>
              Version {contract.version} ·{" "}
              {formatDateRange(contract.startDate, contract.endDate)} · end date
              exclusive
            </CardDescription>
          </div>
          <StatusPill status={contract.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground uppercase">Total</dt>
            <dd className="font-heading text-lg font-semibold">
              {formatMoney(contract.total)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground uppercase">Issued</dt>
            <dd className="text-sm">{formatDate(contract.issuedAt)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground uppercase">
              Accepted
            </dt>
            <dd className="text-sm">{formatDate(contract.acceptedAt)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground uppercase">
              Activated
            </dt>
            <dd className="text-sm">{formatDate(contract.activatedAt)}</dd>
          </div>
        </dl>

        <Separator />

        <LineItems contract={contract} />
      </CardContent>
    </Card>

    <PendingRequests requests={contract.clientRequests} />

    <ContractActions contractId={contract.id} status={contract.status} />

    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign</CardTitle>
          <CardDescription>
            How this contract is progressing through delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contract.campaign ? (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{contract.campaign.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusPill status={contract.campaign.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Current stage</dt>
                <dd className="font-medium">
                  {humanise(contract.campaign.currentStage)}
                </dd>
              </div>
            </dl>
          ) : (
            <EmptyState
              title="No campaign yet"
              message="A campaign is created once this contract is accepted."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service timeline</CardTitle>
          <CardDescription>
            Updates our team has shared with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(contract.serviceEvents ?? []).length === 0 ? (
            <EmptyState
              title="No service updates yet"
              message="Artwork, installation and maintenance milestones will appear here."
            />
          ) : (
            <ServiceEventTimeline events={contract.serviceEvents} />
          )}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Proof of posting</CardTitle>
        <CardDescription>
          Photographic evidence captured on site by our field engineers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProofRecords records={contract.proofRecords} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Status history</CardTitle>
        <CardDescription>
          Every recorded change to this contract, oldest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <HistoryTimeline history={contract.history} />
      </CardContent>
    </Card>
  </div>
);

export const ContractDetailView = ({ contractId }: { contractId: string }) => {
  const { data, isPending, isError, error, refetch } =
    useContractDetail(contractId);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild size="sm" variant="ghost" className="w-fit">
        <Link href="/portal/contracts">
          <ArrowLeft className="size-4" />
          All contracts
        </Link>
      </Button>

      {isPending && <LoadingState label="Loading contract" />}

      {isError && (
        <PortalErrorState
          error={error}
          fallback="We could not load this contract."
          onRetry={() => refetch()}
        />
      )}

      {data && <ContractContent contract={data} />}
    </div>
  );
};
