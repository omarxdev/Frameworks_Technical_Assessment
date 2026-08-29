import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/db/collections";
import { evaluateExclusiveAssetAvailability } from "@/lib/domain/availability/exclusiveAsset";
import { evaluateCapacityPoolAvailability } from "@/lib/domain/availability/capacityPool";
import { isValidDateRange } from "@/lib/domain/availability/dateRange";
import { FIXTURE_CLOCK_DATE } from "@/lib/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Both startDate and endDate query parameters are required (YYYY-MM-DD)",
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

    const productsCol = await collections.products();
    const product = await productsCol.findOne({ id: productId });

    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Product '${productId}' not found` },
        { status: 404 }
      );
    }

    const [
      mediaOwnersDocs,
      locationsDocs,
      assetsDocs,
      capacityPoolsDocs,
      bookingsDocs,
      holdsDocs,
      outagesDocs,
    ] = await Promise.all([
      (await collections.mediaOwners()).find({}).toArray(),
      (await collections.locations()).find({}).toArray(),
      (await collections.assets()).find({}).toArray(),
      (await collections.capacityPools()).find({}).toArray(),
      (await collections.bookings()).find({}).toArray(),
      (await collections.holds()).find({}).toArray(),
      (await collections.outages()).find({}).toArray(),
    ]);

    const mediaOwner = mediaOwnersDocs.find((mo) => mo.id === product.mediaOwnerId);
    const mediaOwnerName = mediaOwner?.name || "Island Media Co";
    const locationsMap = new Map(locationsDocs.map((loc) => [loc.id, loc.name]));
    const locationNames = product.locationIds.map((id) => locationsMap.get(id) || id);

    let availabilitySummary;
    let assetOptions: any[] = [];

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
      assetOptions = result.assetOptions;
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
      assetOptions = [];
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      mediaOwnerName,
      mediaType: product.mediaType,
      locationNames,
      allocationModel: product.allocationModel,
      indicativeRate: product.indicativeRate,
      minimumTermDays: product.minimumTermDays,
      description: product.description,
      creativeSpec: product.creativeSpec || null,
      availability: availabilitySummary,
      assetOptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "PRODUCT_FETCH_FAILED", message: error.message || "Failed to fetch product" },
      { status: 500 }
    );
  }
}
