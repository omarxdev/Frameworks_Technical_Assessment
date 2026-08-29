import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/db/collections";
import { ProductSearchQuerySchema } from "@/lib/schemas";
import { evaluateExclusiveAssetAvailability } from "@/lib/domain/availability/exclusiveAsset";
import { evaluateCapacityPoolAvailability } from "@/lib/domain/availability/capacityPool";
import { isValidDateRange } from "@/lib/domain/availability/dateRange";
import { FIXTURE_CLOCK_DATE } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const mediaType = searchParams.get("mediaType") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const maxMonthlyBudgetStr = searchParams.get("maxMonthlyBudget");

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Both startDate and endDate query parameters are required (format YYYY-MM-DD)",
        },
        { status: 422 }
      );
    }

    if (!isValidDateRange(startDate, endDate)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid date range: startDate must be strictly before endDate",
        },
        { status: 422 }
      );
    }

    const maxMonthlyBudget = maxMonthlyBudgetStr ? parseFloat(maxMonthlyBudgetStr) : undefined;

    const queryParse = ProductSearchQuerySchema.safeParse({
      startDate,
      endDate,
      mediaType,
      locationId,
      maxMonthlyBudget,
    });

    if (!queryParse.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid search parameters",
          details: queryParse.error.flatten(),
        },
        { status: 422 }
      );
    }

    const [
      productsDocs,
      mediaOwnersDocs,
      locationsDocs,
      assetsDocs,
      capacityPoolsDocs,
      bookingsDocs,
      holdsDocs,
      outagesDocs,
    ] = await Promise.all([
      (await collections.products()).find({}).toArray(),
      (await collections.mediaOwners()).find({}).toArray(),
      (await collections.locations()).find({}).toArray(),
      (await collections.assets()).find({}).toArray(),
      (await collections.capacityPools()).find({}).toArray(),
      (await collections.bookings()).find({}).toArray(),
      (await collections.holds()).find({}).toArray(),
      (await collections.outages()).find({}).toArray(),
    ]);

    const mediaOwnersMap = new Map(mediaOwnersDocs.map((mo) => [mo.id, mo.name]));
    const locationsMap = new Map(locationsDocs.map((loc) => [loc.id, loc.name]));

    let filteredProducts = productsDocs;

    // Filter by mediaType if specified
    if (mediaType) {
      filteredProducts = filteredProducts.filter((p) => p.mediaType === mediaType);
    }

    // Filter by locationId if specified
    if (locationId) {
      filteredProducts = filteredProducts.filter((p) => p.locationIds.includes(locationId));
    }

    // Filter by maxMonthlyBudget if specified
    // Rule: Null price ("Price on request") or products without monthlyEquivalent must NOT silently pass
    if (maxMonthlyBudget !== undefined && !isNaN(maxMonthlyBudget)) {
      filteredProducts = filteredProducts.filter((p) => {
        const monthly = p.indicativeRate?.monthlyEquivalent;
        if (monthly === null || monthly === undefined) return false;
        return monthly <= maxMonthlyBudget;
      });
    }

    const items = filteredProducts.map((product) => {
      const mediaOwnerName = mediaOwnersMap.get(product.mediaOwnerId) || "Island Media Co";
      const locationNames = product.locationIds.map((id) => locationsMap.get(id) || id);

      let availabilitySummary;
      if (product.allocationModel === "exclusive_asset") {
        const result = evaluateExclusiveAssetAvailability({
          productId: product.id,
          startDate,
          endDate,
          assets: assetsDocs,
          bookings: bookingsDocs,
          holds: holdsDocs,
          outages: outagesDocs,
          clock: FIXTURE_CLOCK_DATE,
        });
        availabilitySummary = result.summary;
      } else {
        const result = evaluateCapacityPoolAvailability({
          productId: product.id,
          startDate,
          endDate,
          pools: capacityPoolsDocs,
          bookings: bookingsDocs,
          holds: holdsDocs,
          clock: FIXTURE_CLOCK_DATE,
        });
        availabilitySummary = result.summary;
      }

      return {
        id: product.id,
        name: product.name,
        mediaOwnerName,
        mediaType: product.mediaType,
        locationNames,
        allocationModel: product.allocationModel,
        indicativeRate: product.indicativeRate,
        minimumTermDays: product.minimumTermDays,
        availability: availabilitySummary,
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
}
