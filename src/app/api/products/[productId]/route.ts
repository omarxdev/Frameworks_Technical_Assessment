import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/db/collections";
import { describeAvailability, loadInventory } from "@/lib/domain/availability/recheck";
import { isValidDateRange } from "@/lib/domain/availability/date-range";
import { notFound, validationError } from "@/lib/api/responses";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) => {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return validationError(
        "Both startDate and endDate query parameters are required (YYYY-MM-DD)"
      );
    }

    if (!isValidDateRange(startDate, endDate)) {
      return validationError("Invalid date range: startDate must be strictly before endDate");
    }

    const [inventory, mediaOwnersDocs, locationsDocs] = await Promise.all([
      loadInventory(),
      (await collections.mediaOwners()).find({}).toArray(),
      (await collections.locations()).find({}).toArray(),
    ]);

    const product = inventory.products.find((p) => p.id === productId);

    if (!product) {
      return notFound(`Product '${productId}' not found`);
    }

    const locationsMap = new Map(locationsDocs.map((loc) => [loc.id, loc.name]));
    const mediaOwner = mediaOwnersDocs.find((mo) => mo.id === product.mediaOwnerId);

    const { summary, assetOptions } = describeAvailability({
      inventory,
      productId: product.id,
      startDate,
      endDate,
    });

    return NextResponse.json({
      id: product.id,
      name: product.name,
      mediaOwnerName: mediaOwner?.name || "Island Media Co",
      mediaType: product.mediaType,
      locationNames: product.locationIds.map((id) => locationsMap.get(id) || id),
      allocationModel: product.allocationModel,
      indicativeRate: product.indicativeRate,
      minimumTermDays: product.minimumTermDays,
      description: product.description,
      creativeSpec: product.creativeSpec || null,
      availability: summary,
      assetOptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "PRODUCT_FETCH_FAILED",
        message: error.message || "Failed to fetch product",
      },
      { status: 500 }
    );
  }
};
