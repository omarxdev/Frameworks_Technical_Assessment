"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Callout, ErrorState, LoadingState } from "@/components/ui/states";
import { AvailabilityPanel } from "@/features/management/components/availability-panel";
import { DecisionPanel } from "@/features/management/components/decision-panel";
import { DraftContractForm } from "@/features/management/components/draft-contract-form";
import { HistoryTimeline } from "@/features/management/components/history-timeline";
import {
  useBookingRequest,
  useProductAssetOptions,
} from "@/features/management/hooks/use-management-data";
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatMoney,
} from "@/features/management/lib/format";

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium break-words">{value}</dd>
  </div>
);

export const RequestDetailView = ({ requestId }: { requestId: string }) => {
  const { data, isPending, isError, error, refetch } = useBookingRequest(requestId);

  const isExclusive = data?.product.allocationModel === "exclusive_asset";
  const productQuery = useProductAssetOptions(
    data?.productId,
    data?.startDate,
    data?.endDate,
    Boolean(isExclusive)
  );

  if (isPending) return <LoadingState label="Loading the booking request" />;

  if (isError) {
    return (
      <ErrorState
        title="This booking request could not be loaded"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  const assetOptions = productQuery.data?.assetOptions ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="w-fit gap-1.5 px-2">
          <Link href="/management/requests">
            <ArrowLeft className="size-3.5" />
            All requests
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {data.organisation.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.product.name} · {formatDateRange(data.startDate, data.endDate)} ·{" "}
              {data.id}
            </p>
          </div>
          <StatusPill status={data.status} />
        </div>
      </div>

      {data.draftContractId && (
        <Callout tone="info" title="A draft contract already exists">
          <div className="flex flex-wrap items-center gap-3">
            <span>Contract {data.draftContractId} was created from this request.</span>
            <Button asChild size="sm" variant="outline" className="gap-1.5 bg-background">
              <Link href={`/management/contracts/${data.draftContractId}`}>
                <FileText className="size-3.5" />
                Open contract
              </Link>
            </Button>
          </div>
        </Callout>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <AvailabilityPanel
            availability={data.currentAvailability}
            startDate={data.startDate}
            endDate={data.endDate}
          />

          <DecisionPanel
            requestId={data.id}
            status={data.status}
            allocationModel={data.product.allocationModel}
            assetOptions={assetOptions}
            assetOptionsPending={Boolean(isExclusive) && productQuery.isPending}
            requestedAssetId={data.requestedAssetId}
          />

          {data.status === "approved" && !data.draftContractId && (
            <DraftContractForm
              bookingRequestId={data.id}
              organisationId={data.organisationId}
              productId={data.productId}
              startDate={data.startDate}
              endDate={data.endDate}
              rateUnit={data.product.indicativeRate.unit ?? ""}
              isExclusive={Boolean(isExclusive)}
              assetOptions={assetOptions}
              requestedAssetId={data.requestedAssetId}
            />
          )}
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 font-heading text-lg font-semibold tracking-tight">
              Client and brief
            </h2>
            <dl>
              <DetailRow label="Organisation" value={data.organisation.name} />
              <DetailRow
                label="Contact"
                value={
                  data.advertiser
                    ? `${data.advertiser.contactName} · ${data.advertiser.email}`
                    : "Not supplied"
                }
              />
              <DetailRow
                label="Client since"
                value={formatDate(data.organisation.createdAt)}
              />
              <DetailRow
                label="Existing contracts"
                value={data.organisation.contractCount}
              />
              <DetailRow label="Objective" value={data.objective} />
              <DetailRow label="Stated budget" value={formatMoney(data.budget)} />
              <DetailRow label="Client notes" value={data.notes || "None"} />
              <DetailRow label="Submitted" value={formatDateTime(data.createdAt)} />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 font-heading text-lg font-semibold tracking-tight">
              Requested inventory
            </h2>
            <dl>
              <DetailRow label="Product" value={data.product.name} />
              <DetailRow label="Media owner" value={data.product.mediaOwnerName} />
              <DetailRow label="Media type" value={data.product.mediaType} />
              <DetailRow
                label="Locations"
                value={data.product.locationNames.join(", ")}
              />
              <DetailRow
                label="Allocation model"
                value={
                  data.product.allocationModel === "exclusive_asset"
                    ? "Exclusive asset"
                    : "Capacity pool"
                }
              />
              <DetailRow
                label="Indicative rate"
                value={data.product.indicativeRate.label}
              />
              <DetailRow
                label="Minimum term"
                value={`${data.product.minimumTermDays} days`}
              />
              <DetailRow
                label="Requested dates"
                value={formatDateRange(data.startDate, data.endDate)}
              />
              <DetailRow
                label="Preferred asset"
                value={data.requestedAssetId || "No preference"}
              />
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
