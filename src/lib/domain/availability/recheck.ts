import { collections } from "@/lib/db/collections";
import { FIXTURE_CLOCK_DATE } from "@/lib/constants";
import { evaluateExclusiveAssetAvailability } from "./exclusiveAsset";
import { evaluateCapacityPoolAvailability } from "./capacityPool";
import type { AvailabilitySummary, AssetOption } from "@/lib/schemas";

export interface InventorySnapshot {
  products: any[];
  assets: any[];
  capacityPools: any[];
  bookings: any[];
  holds: any[];
  outages: any[];
}

export const loadInventory = async (): Promise<InventorySnapshot> => {
  const [products, assets, capacityPools, bookings, holds, outages] =
    await Promise.all([
      (await collections.products()).find({}).toArray(),
      (await collections.assets()).find({}).toArray(),
      (await collections.capacityPools()).find({}).toArray(),
      (await collections.bookings()).find({}).toArray(),
      (await collections.holds()).find({}).toArray(),
      (await collections.outages()).find({}).toArray(),
    ]);

  return { products, assets, capacityPools, bookings, holds, outages };
};

export interface AvailabilityCheck {
  summary: AvailabilitySummary;
  assetOptions: AssetOption[];
  allocatable: boolean;
  conflictReason: string | null;
}

export const checkAvailability = (params: {
  inventory: InventorySnapshot;
  productId: string;
  startDate: string;
  endDate: string;
  selectedAssetId?: string | null;
  requiredUnits?: number;
  clock?: Date;
}): AvailabilityCheck => {
  const clock = params.clock ?? FIXTURE_CLOCK_DATE;
  const { inventory } = params;
  const product = inventory.products.find((p) => p.id === params.productId);

  if (!product) {
    return {
      summary: {
        state: "unavailable",
        reason: `Product '${params.productId}' not found.`,
        calculatedAt: clock.toISOString(),
      },
      assetOptions: [],
      allocatable: false,
      conflictReason: `Product '${params.productId}' not found.`,
    };
  }

  if (product.allocationModel === "exclusive_asset") {
    const result = evaluateExclusiveAssetAvailability({
      productId: product.id,
      startDate: params.startDate,
      endDate: params.endDate,
      assets: inventory.assets,
      bookings: inventory.bookings,
      holds: inventory.holds,
      outages: inventory.outages,
      clock,
    });

    if (params.selectedAssetId) {
      const chosen = result.assetOptions.find(
        (a) => a.id === params.selectedAssetId
      );

      if (!chosen) {
        return {
          ...result,
          allocatable: false,
          conflictReason: `Asset '${params.selectedAssetId}' is not an active asset for this product.`,
        };
      }

      if (chosen.availability.state === "unavailable") {
        return {
          ...result,
          allocatable: false,
          conflictReason: `${chosen.name} is not free for these dates: ${chosen.availability.reason}`,
        };
      }

      return { ...result, allocatable: true, conflictReason: null };
    }

    const allocatable = result.summary.state !== "unavailable";
    return {
      ...result,
      allocatable,
      conflictReason: allocatable ? null : result.summary.reason,
    };
  }

  const result = evaluateCapacityPoolAvailability({
    productId: product.id,
    startDate: params.startDate,
    endDate: params.endDate,
    pools: inventory.capacityPools,
    bookings: inventory.bookings,
    holds: inventory.holds,
    clock,
  });

  const required = params.requiredUnits ?? 1;
  const remaining = result.summary.availableCapacity ?? 0;
  const allocatable = remaining >= required;

  return {
    summary: result.summary,
    assetOptions: [],
    allocatable,
    conflictReason: allocatable
      ? null
      : `${result.summary.reason} Requested ${required} unit(s), ${remaining} remaining.`,
  };
};
