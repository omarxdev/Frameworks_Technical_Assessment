"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Callout, LoadingState } from "@/components/ui/states";
import { StatusPill, humanise } from "@/components/ui/status-pill";
import { AssetOptionList } from "@/features/portal/components/asset-options";
import { BookingRequestForm } from "@/features/portal/components/booking-request-form";
import { PortalErrorState } from "@/features/portal/components/portal-states";
import { ShortlistButton } from "@/features/portal/components/shortlist-button";
import { useProductDetail } from "@/features/portal/hooks/use-portal-data";
import { FIXTURE_TODAY, isValidRange } from "@/features/portal/lib/catalogue-options";
import { formatDateRange, formatDay as formatDate, humaniseKey } from "@/lib/format";
import type { PortalProductDetail } from "@/features/portal/lib/types";
import { SubsectionLabel } from "@/components/ui/typography";

const availabilityTone = {
  available: "ok",
  confirmation_required: "warn",
  unavailable: "stop",
} as const;

const CreativeSpecList = ({ spec }: { spec: Record<string, unknown> | null }) => {
  if (!spec || Object.keys(spec).length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Creative specification is issued with the contract for this product.
      </p>
    );
  }

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {Object.entries(spec).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">{humaniseKey(key)}</dt>
          <dd className="font-medium">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
};

const ProductDetailContent = ({
  product,
  startDate,
  endDate,
}: {
  product: PortalProductDetail;
  startDate: string;
  endDate: string;
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState("");

  const selectedAsset =
    product.assetOptions.find((asset) => asset.id === selectedAssetId) ?? null;

  const isExclusive = product.allocationModel === "exclusive_asset";

  return (
    <div className="grid gap-6 lg:grid-cols-detail-aside lg:items-start">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle size="lg">{product.name}</CardTitle>
                <CardDescription>
                  {product.mediaOwnerName} · {humanise(product.mediaType)} ·{" "}
                  {humanise(product.allocationModel)}
                </CardDescription>
              </div>
              <StatusPill status={product.availability.state} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-muted-foreground text-sm">{product.description}</p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs uppercase">
                  Indicative rate
                </span>
                <span className="font-heading text-lg font-semibold">
                  {product.indicativeRate.label}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs uppercase">
                  Minimum term
                </span>
                <span className="font-heading text-lg font-semibold">
                  {product.minimumTermDays} days
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs uppercase">
                  Locations
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <MapPin className="size-4 shrink-0" />
                  {product.locationNames.join(", ")}
                </span>
              </div>
            </div>

            <Callout tone={availabilityTone[product.availability.state]}>
              <p className="font-semibold">
                {humanise(product.availability.state)} for{" "}
                {formatDateRange(startDate, endDate)}
              </p>
              <p>{product.availability.reason}</p>
              {product.availability.freshestVerificationAt && (
                <p className="mt-1 text-xs opacity-80">
                  Most recent verification{" "}
                  {formatDate(product.availability.freshestVerificationAt)}.
                </p>
              )}
            </Callout>

            <div className="flex flex-col gap-2">
              <SubsectionLabel as="h2">Creative specification</SubsectionLabel>
              <CreativeSpecList spec={product.creativeSpec} />
            </div>
          </CardContent>
        </Card>

        {isExclusive && (
          <Card>
            <CardHeader>
              <CardTitle size="lg">Individual sites and vehicles</CardTitle>
              <CardDescription>
                Each asset is checked against confirmed bookings, active holds and
                outages for your exact dates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {product.assetOptions.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No active assets are configured for this product right now.
                </p>
              ) : (
                <AssetOptionList
                  assets={product.assetOptions}
                  selectedAssetId={selectedAssetId}
                  onSelect={setSelectedAssetId}
                />
              )}
            </CardContent>
          </Card>
        )}

        {!isExclusive && (
          <Card>
            <CardHeader>
              <CardTitle size="lg">Network capacity</CardTitle>
              <CardDescription>
                This product is sold from a shared loop rather than a single site.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {product.availability.availableCapacity ?? 0} of{" "}
              {product.availability.totalCapacity ?? 0} slots are free for{" "}
              {formatDateRange(startDate, endDate)}.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <BookingRequestForm
          productId={product.id}
          productName={product.name}
          minimumTermDays={product.minimumTermDays}
          startDate={startDate}
          endDate={endDate}
          requestedAssetId={selectedAssetId}
          requestedAssetName={selectedAsset ? selectedAsset.name : null}
        />
        <ShortlistButton
          productId={product.id}
          productName={product.name}
          rateLabel={product.indicativeRate.label}
          startDate={startDate}
          endDate={endDate}
          className="w-full"
        />
      </div>
    </div>
  );
};

export const ProductDetailView = ({
  productId,
  initialStartDate,
  initialEndDate,
}: {
  productId: string;
  initialStartDate: string;
  initialEndDate: string;
}) => {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const rangeValid = isValidRange(startDate, endDate);

  const { data, isPending, isError, error, refetch } = useProductDetail(
    productId,
    startDate,
    endDate
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/portal/catalogue?startDate=${startDate}&endDate=${endDate}`}>
            <ArrowLeft className="size-4" />
            Back to catalogue
          </Link>
        </Button>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detailStartDate">Start date</Label>
            <DatePicker
              id="detailStartDate"
              min={FIXTURE_TODAY}
              value={startDate}
              onChange={setStartDate}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detailEndDate">End date</Label>
            <DatePicker
              id="detailEndDate"
              min={startDate || FIXTURE_TODAY}
              value={endDate}
              onChange={setEndDate}
            />
          </div>
        </div>
      </div>

      {!rangeValid && (
        <Callout tone="stop" title="Check your dates">
          The start date must be strictly before the end date before we can calculate
          availability.
        </Callout>
      )}

      {rangeValid && isPending && <LoadingState label="Calculating availability" />}

      {rangeValid && isError && (
        <PortalErrorState
          error={error}
          fallback="We could not load this product."
          onRetry={() => refetch()}
        />
      )}

      {rangeValid && data && (
        <ProductDetailContent product={data} startDate={startDate} endDate={endDate} />
      )}
    </div>
  );
};
