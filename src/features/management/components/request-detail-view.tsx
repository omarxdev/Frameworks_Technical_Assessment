"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { ManagementErrorState } from "@/features/management/components/management-states";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Callout, LoadingState } from "@/components/ui/states";
import { AvailabilityPanel } from "@/features/management/components/availability-panel";
import { DecisionPanel } from "@/features/management/components/decision-panel";
import { DraftContractForm } from "@/features/management/components/draft-contract-form";
import { Timeline, historyItems } from "@/components/shared/timeline";
import { PageTitle, SectionTitle } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";
import { DetailRow } from "@/components/shared/detail-row";
import {
  useBookingRequest,
  useProductAssetOptions,
} from "@/features/management/hooks/use-management-data";
import {
  formatDateRange,
  formatDay as formatDate,
  formatMoment as formatDateTime,
  formatMoney,
} from "@/lib/format";

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
      <ManagementErrorState
        error={error}
        title="This booking request could not be loaded"
        fallback="The booking request could not be loaded."
        onRetry={() => refetch()}
      />
    );
  }

  const assetOptions = productQuery.data?.assetOptions ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="w-fit">
          <Link href="/management/requests">
            <ArrowLeft className="size-4" />
            All requests
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <PageTitle>
              {data.organisation.name}
            </PageTitle>
            <p className="text-muted-foreground text-sm">
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
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <Link href={`/management/contracts/${data.draftContractId}`}>
                <FileText className="size-4" />
                Open contract
              </Link>
            </Button>
          </div>
        </Callout>
      )}

      <div className="grid gap-6 xl:grid-cols-detail">
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
          <Card>
            <CardContent>
              <SectionTitle className="mb-2">
                Client and brief
              </SectionTitle>
              <dl>
                <DetailRow
                  label="Organisation"
                  value={
                    <Link
                      href={`/management/clients/${data.organisationId}`}
                      className="underline underline-offset-4"
                    >
                      {data.organisation.name}
                    </Link>
                  }
                />
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
                      </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionTitle className="mb-2">
                Requested inventory
              </SectionTitle>
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
