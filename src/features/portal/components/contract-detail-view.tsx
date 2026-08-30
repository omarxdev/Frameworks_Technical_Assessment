"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Callout, EmptyState, LoadingState } from "@/components/ui/states";
import { DataTable } from "@/components/shared/data-table";
import { StatusPill, humanise } from "@/components/ui/status-pill";
import { ProofGallery } from "@/components/shared/proof-gallery";
import { ContractActions } from "@/features/portal/components/contract-actions";
import { PortalErrorState } from "@/features/portal/components/portal-states";
import {
  Timeline,
  historyItems,
  serviceEventItems,
} from "@/components/shared/timeline";
import { useContractDetail } from "@/features/portal/hooks/use-portal-data";
import {
  formatDateRange,
  formatDay as formatDate,
  formatMoment as formatDateTime,
  formatMoney,
  humaniseKey,
} from "@/lib/format";
import type {
  PortalClientRequest,
  PortalContractDetail,
} from "@/features/portal/lib/types";

const PendingRequests = ({ requests }: { requests: PortalClientRequest[] }) => {
  const pending = (requests ?? []).filter((request) => request.status === "submitted");

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
            Sent {formatDateTime(request.createdAt)} · reference {request.id}. Nothing
            has been approved or applied yet.
          </p>
        </Callout>
      ))}
    </div>
  );
};

const LineItems = ({ contract }: { contract: PortalContractDetail }) => (
  <DataTable
    rows={contract.items}
    rowKey={(item) => item.id}
    footer={{ label: "Contract total", value: formatMoney(contract.total) }}
    columns={[
      { header: "Product", role: "title", cell: (item) => item.productId },
      {
        header: "Asset",
        className: "text-muted-foreground",
        cell: (item) =>
          item.assetId ?? item.capacityPoolId ?? "Allocated on activation",
      },
      { header: "Qty", align: "right", cell: (item) => item.quantity },
      {
        header: "Unit rate",
        align: "right",
        cell: (item) =>
          item.unitRate === null || item.unitRate === undefined
            ? "On request"
            : `${formatMoney(item.unitRate)}${item.rateUnit ? ` / ${humanise(item.rateUnit)}` : ""}`,
      },
      {
        header: "Line total",
        align: "right",
        cell: (item) => formatMoney(item.lineTotal),
      },
    ]}
  />
);

const ContractContent = ({ contract }: { contract: PortalContractDetail }) => (
  <div className="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle size="lg">{contract.id}</CardTitle>
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
            <dt className="text-muted-foreground text-xs uppercase">Total</dt>
            <dd className="font-heading text-lg font-semibold">
              {formatMoney(contract.total)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase">Issued</dt>
            <dd className="text-sm">{formatDate(contract.issuedAt)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase">Accepted</dt>
            <dd className="text-sm">{formatDate(contract.acceptedAt)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase">Activated</dt>
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
          <CardTitle size="lg">Campaign</CardTitle>
          <CardDescription>
            How this contract is progressing through delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contract.campaign ? (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{contract.campaign.name}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusPill status={contract.campaign.status} />
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
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
          <CardTitle size="lg">Service timeline</CardTitle>
          <CardDescription>Updates our team has shared with you.</CardDescription>
        </CardHeader>
        <CardContent>
          {(contract.serviceEvents ?? []).length === 0 ? (
            <EmptyState
              title="No service updates yet"
              message="Artwork, installation and maintenance milestones will appear here."
            />
          ) : (
            <Timeline items={serviceEventItems(contract.serviceEvents)} />
          )}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle size="lg">Proof of posting</CardTitle>
        <CardDescription>
          Photographic evidence captured on site by our field engineers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProofGallery
          records={contract.proofRecords}
          emptyTitle="No proof of posting yet"
          emptyMessage="Once our field team completes the installation, their photos and completion notes appear here."
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle size="lg">Status history</CardTitle>
        <CardDescription>
          Every recorded change to this contract, oldest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Timeline items={historyItems(contract.history)} dotTone="muted" />
      </CardContent>
    </Card>
  </div>
);

export const ContractDetailView = ({ contractId }: { contractId: string }) => {
  const { data, isPending, isError, error, refetch } = useContractDetail(contractId);

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
