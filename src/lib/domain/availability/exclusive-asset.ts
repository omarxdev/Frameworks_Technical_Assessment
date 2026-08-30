import { FIXTURE_CLOCK, FIXTURE_CLOCK_DATE } from "@/lib/constants";
import { formatDay, pluralise } from "@/lib/format";
import { hasHalfOpenOverlap, parseDate } from "./date-range";
import type {
  Asset,
  AssetOption,
  AvailabilityBlocker,
  AvailabilitySummary,
  Booking,
  Hold,
  Outage,
} from "@/lib/schemas";

export const VERIFICATION_STALE_AFTER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ExclusiveAssetAvailabilityResult {
  summary: AvailabilitySummary;
  assetOptions: AssetOption[];
}

export const isHoldActive = (hold: Hold, clock: Date = FIXTURE_CLOCK_DATE) => {
  if (hold.status !== "active") return false;
  return parseDate(hold.expiresAt).getTime() > clock.getTime();
};

export const isVerificationStale = (
  verifiedAt: string | null | undefined,
  clock: Date = FIXTURE_CLOCK_DATE
) => {
  if (!verifiedAt) return true;
  const age = clock.getTime() - parseDate(verifiedAt).getTime();
  return age > VERIFICATION_STALE_AFTER_DAYS * DAY_MS;
};

const blockersForAsset = (params: {
  asset: Asset;
  startDate: string;
  endDate: string;
  bookings: Booking[];
  holds: Hold[];
  outages: Outage[];
  clock: Date;
}): AvailabilityBlocker[] => {
  const { asset, startDate, endDate, bookings, holds, outages, clock } = params;
  const overlaps = (s: string, e: string) =>
    hasHalfOpenOverlap(startDate, endDate, s, e);

  const bookingBlockers = bookings
    .filter(
      (b) =>
        b.assetId === asset.id &&
        b.status === "confirmed" &&
        overlaps(b.startDate, b.endDate)
    )
    .map<AvailabilityBlocker>((b) => ({
      kind: "booking",
      id: b.id,
      label: b.campaignName ? `Booked: ${b.campaignName}` : "Confirmed booking",
      startDate: b.startDate,
      endDate: b.endDate,
    }));

  const holdBlockers = holds
    .filter(
      (h) =>
        h.assetId === asset.id &&
        isHoldActive(h, clock) &&
        overlaps(h.startDate, h.endDate)
    )
    .map<AvailabilityBlocker>((h) => ({
      kind: "hold",
      id: h.id,
      label: `Active hold until ${formatDay(h.expiresAt)}`,
      startDate: h.startDate,
      endDate: h.endDate,
    }));

  const outageBlockers = outages
    .filter(
      (o) =>
        o.assetId === asset.id &&
        o.status === "confirmed" &&
        overlaps(o.startDate, o.endDate)
    )
    .map<AvailabilityBlocker>((o) => ({
      kind: "outage",
      id: o.id,
      label: `Outage: ${o.reason || "scheduled maintenance"}`,
      startDate: o.startDate,
      endDate: o.endDate,
    }));

  return [...bookingBlockers, ...holdBlockers, ...outageBlockers];
};

export const evaluateExclusiveAssetAvailability = (params: {
  productId: string;
  startDate: string;
  endDate: string;
  assets: Asset[];
  bookings: Booking[];
  holds: Hold[];
  outages: Outage[];
  clock?: Date;
}): ExclusiveAssetAvailabilityResult => {
  const clock = params.clock ?? FIXTURE_CLOCK_DATE;

  const productAssets = params.assets.filter(
    (a) => a.productId === params.productId && a.status === "active"
  );

  const assetOptions = productAssets.map<AssetOption>((asset) => {
    const blockers = blockersForAsset({
      asset,
      startDate: params.startDate,
      endDate: params.endDate,
      bookings: params.bookings,
      holds: params.holds,
      outages: params.outages,
      clock,
    });

    const stale = isVerificationStale(asset.verifiedAt, clock);

    const state = blockers.length
      ? ("unavailable" as const)
      : stale
        ? ("confirmation_required" as const)
        : ("available" as const);

    const reason = blockers.length
      ? blockers.map((b) => b.label).join("; ")
      : stale
        ? asset.note?.trim() ||
          `Last verified ${asset.verifiedAt ? formatDay(asset.verifiedAt) : "never"}; confirm with the media owner before approval.`
        : "Free for the requested dates.";

    return {
      ...asset,
      availability: {
        state,
        reason,
        calculatedAt: FIXTURE_CLOCK,
        availableAssetCount: state === "available" ? 1 : 0,
        freshestVerificationAt: asset.verifiedAt ?? null,
        verificationStale: stale,
        blockers,
      },
    };
  });

  const free = assetOptions.filter((a) => a.availability.state === "available");
  const needsConfirmation = assetOptions.filter(
    (a) => a.availability.state === "confirmation_required"
  );
  const allocatable = [...free, ...needsConfirmation];

  const freshestVerificationAt = allocatable.reduce<string | null>(
    (freshest, option) => {
      const candidate = option.verifiedAt;
      if (!candidate) return freshest;
      if (!freshest) return candidate;
      return parseDate(candidate) > parseDate(freshest) ? candidate : freshest;
    },
    null
  );

  const blockers = assetOptions.flatMap((a) => a.availability.blockers ?? []);

  const summary: AvailabilitySummary =
    productAssets.length === 0
      ? {
          state: "unavailable",
          reason: "No active physical assets are configured for this product.",
          calculatedAt: FIXTURE_CLOCK,
          availableAssetCount: 0,
          freshestVerificationAt: null,
          verificationStale: true,
          blockers: [],
        }
      : free.length > 0
        ? {
            state: "available",
            reason: `${free.length} of ${pluralise(productAssets.length, "asset")} free for the requested dates.`,
            calculatedAt: FIXTURE_CLOCK,
            availableAssetCount: free.length,
            freshestVerificationAt,
            verificationStale: false,
            blockers,
          }
        : needsConfirmation.length > 0
          ? {
              state: "confirmation_required",
              reason: `${pluralise(needsConfirmation.length, "asset")} ${needsConfirmation.length === 1 ? "is" : "are"} free but verification is over ${VERIFICATION_STALE_AFTER_DAYS} days old. Confirm with the media owner before approval.`,
              calculatedAt: FIXTURE_CLOCK,
              availableAssetCount: needsConfirmation.length,
              freshestVerificationAt,
              verificationStale: true,
              blockers,
            }
          : {
              state: "unavailable",
              reason: `${productAssets.length === 1 ? "The only asset is" : `All ${productAssets.length} assets are`} booked, on active hold, or under a confirmed outage for the requested dates.`,
              calculatedAt: FIXTURE_CLOCK,
              availableAssetCount: 0,
              freshestVerificationAt: null,
              verificationStale: false,
              blockers,
            };

  return { summary, assetOptions };
};
