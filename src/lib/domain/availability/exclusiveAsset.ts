import { FIXTURE_CLOCK, FIXTURE_CLOCK_DATE } from "@/lib/constants";
import { hasHalfOpenOverlap, parseDate } from "./dateRange";
import type { Asset, Booking, Hold, Outage, AvailabilitySummary, AssetOption } from "@/lib/schemas";

export interface ExclusiveAssetAvailabilityResult {
  summary: AvailabilitySummary;
  assetOptions: AssetOption[];
}

export function isHoldActive(hold: Hold, clock: Date = FIXTURE_CLOCK_DATE): boolean {
  if (hold.status !== "active") return false;
  const expiresAt = parseDate(hold.expiresAt);
  return expiresAt.getTime() > clock.getTime();
}

export function evaluateExclusiveAssetAvailability(params: {
  productId: string;
  startDate: string;
  endDate: string;
  assets: Asset[];
  bookings: Booking[];
  holds: Hold[];
  outages: Outage[];
  clock?: Date;
}): ExclusiveAssetAvailabilityResult {
  const clock = params.clock || FIXTURE_CLOCK_DATE;
  const productAssets = params.assets.filter(
    (a) => a.productId === params.productId && a.status === "active"
  );

  const assetOptions: AssetOption[] = [];
  let availableCount = 0;
  let freshestVerification: string | null = null;
  let hasConfirmationRequiredOnly = false;

  for (const asset of productAssets) {
    // Check confirmed bookings
    const overlappingBookings = params.bookings.filter(
      (b) =>
        b.assetId === asset.id &&
        b.status === "confirmed" &&
        hasHalfOpenOverlap(params.startDate, params.endDate, b.startDate, b.endDate)
    );

    // Check active holds (expired holds do NOT block)
    const overlappingHolds = params.holds.filter(
      (h) =>
        h.assetId === asset.id &&
        isHoldActive(h, clock) &&
        hasHalfOpenOverlap(params.startDate, params.endDate, h.startDate, h.endDate)
    );

    // Check confirmed outages
    const overlappingOutages = params.outages.filter(
      (o) =>
        o.assetId === asset.id &&
        o.status === "confirmed" &&
        hasHalfOpenOverlap(params.startDate, params.endDate, o.startDate, o.endDate)
    );

    const isBlocked =
      overlappingBookings.length > 0 ||
      overlappingHolds.length > 0 ||
      overlappingOutages.length > 0;

    let assetState: "available" | "unavailable" | "confirmation_required" = "available";
    let assetReason = "Asset is available for requested dates";

    if (overlappingBookings.length > 0) {
      assetState = "unavailable";
      assetReason = `Booked for campaign "${overlappingBookings[0]?.campaignName || "Confirmed Booking"}"`;
    } else if (overlappingHolds.length > 0) {
      assetState = "unavailable";
      assetReason = `Reserved under active hold until ${overlappingHolds[0]?.expiresAt}`;
    } else if (overlappingOutages.length > 0) {
      assetState = "unavailable";
      assetReason = `Outage/Maintenance: ${overlappingOutages[0]?.reason || "Scheduled Outage"}`;
    } else if (asset.note && asset.note.toLowerCase().includes("confirmation")) {
      assetState = "confirmation_required";
      assetReason = asset.note;
    }

    if (assetState === "available" || assetState === "confirmation_required") {
      availableCount++;
      if (asset.verifiedAt) {
        if (!freshestVerification || parseDate(asset.verifiedAt) > parseDate(freshestVerification)) {
          freshestVerification = asset.verifiedAt;
        }
      }
    }

    assetOptions.push({
      ...asset,
      availability: {
        state: assetState,
        reason: assetReason,
        calculatedAt: FIXTURE_CLOCK,
        availableAssetCount: assetState === "available" ? 1 : 0,
        freshestVerificationAt: asset.verifiedAt || null,
      },
    });
  }

  let overallState: "available" | "unavailable" | "confirmation_required" = "unavailable";
  let overallReason = "No active physical assets match this product";

  if (productAssets.length === 0) {
    overallState = "unavailable";
    overallReason = "No active physical assets configured";
  } else if (availableCount > 0) {
    // Check if only confirmation_required assets are available
    const fullyAvailable = assetOptions.filter((a) => a.availability.state === "available");
    if (fullyAvailable.length === 0) {
      overallState = "confirmation_required";
      overallReason = `${availableCount} asset(s) available subject to operator confirmation`;
    } else {
      overallState = "available";
      overallReason = `${fullyAvailable.length} of ${productAssets.length} asset(s) available for selected dates`;
    }
  } else {
    overallState = "unavailable";
    overallReason = `All ${productAssets.length} asset(s) are booked, reserved on hold, or under maintenance for the requested dates`;
  }

  return {
    summary: {
      state: overallState,
      reason: overallReason,
      calculatedAt: FIXTURE_CLOCK,
      availableAssetCount: availableCount,
      freshestVerificationAt: freshestVerification,
    },
    assetOptions,
  };
}
