import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/db/collections";
import { ProductSearchQuerySchema } from "@/lib/schemas";
import { describeAvailability, loadInventory } from "@/lib/domain/availability/recheck";
import { isValidDateRange } from "@/lib/domain/availability/date-range";
import { validationError } from "@/lib/api/responses";

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const mediaType = searchParams.get("mediaType") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const maxMonthlyBudgetStr = searchParams.get("maxMonthlyBudget");

    if (!startDate || !endDate) {
      return validationError(
        "Both startDate and endDate query parameters are required (format YYYY-MM-DD)"
      );
    }

    if (!isValidDateRange(startDate, endDate)) {
      return validationError("Invalid date range: startDate must be strictly before endDate");
    }

    const maxMonthlyBudget = maxMonthlyBudgetStr
      ? parseFloat(maxMonthlyBudgetStr)
      : undefined;

    const queryParse = ProductSearchQuerySchema.safeParse({
      startDate,
      endDate,
      mediaType,
      locationId,
      maxMonthlyBudget,
    });

    if (!queryParse.success) {
      return validationError("Invalid search parameters", queryParse.error.flatten());
    }

    const [inventory, mediaOwnersDocs, locationsDocs] = await Promise.all([
      loadInventory(),
      (await collections.mediaOwners()).find({}).toArray(),
      (await collections.locations()).find({}).toArray(),
    ]);

    const mediaOwnersMap = new Map(mediaOwnersDocs.map((mo) => [mo.id, mo.name]));
    const locationsMap = new Map(locationsDocs.map((loc) => [loc.id, loc.name]));

    let filteredProducts = inventory.products;

    if (mediaType) {
      filteredProducts = filteredProducts.filter((p) => p.mediaType === mediaType);
    }

    if (locationId) {
      filteredProducts = filteredProducts.filter((p) =>
        p.locationIds.includes(locationId)
      );
    }

    if (maxMonthlyBudget !== undefined && !isNaN(maxMonthlyBudget)) {
      filteredProducts = filteredProducts.filter((p) => {
        const monthly = p.indicativeRate?.monthlyEquivalent;
        if (monthly === null || monthly === undefined) return false;
        return monthly <= maxMonthlyBudget;
      });
    }

    const items = filteredProducts.map((product) => {
      const { summary } = describeAvailability({
        inventory,
        productId: product.id,
        startDate,
        endDate,
      });

      return {
        id: product.id,
        name: product.name,
        mediaOwnerName: mediaOwnersMap.get(product.mediaOwnerId) || "Island Media Co",
        mediaType: product.mediaType,
        locationNames: product.locationIds.map((id) => locationsMap.get(id) || id),
        allocationModel: product.allocationModel,
        indicativeRate: product.indicativeRate,
        minimumTermDays: product.minimumTermDays,
        availability: summary,
      };
    });

    return NextResponse.json({
      query: {
        startDate,
        endDate,
        mediaType: mediaType || null,
        locationId: locationId || null,
        maxMonthlyBudget: maxMonthlyBudget ?? null,
      },
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "SEARCH_FAILED", message: error.message || "Failed to search products" },
      { status: 500 }
    );
  }
};
