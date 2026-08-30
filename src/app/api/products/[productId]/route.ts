import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/db/collections";
import { describeAvailability, loadInventory } from "@/lib/domain/availability/recheck";
import { isValidDateRange } from "@/lib/domain/availability/date-range";

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
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message:
            "Both startDate and endDate query parameters are required (YYYY-MM-DD)",
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

    const [inventory, mediaOwnersDocs, locationsDocs] = await Promise.all([
      loadInventory(),
      (await collections.mediaOwners()).find({}).toArray(),
      (await collections.locations()).find({}).toArray(),
    ]);

    const product = inventory.products.find((p) => p.id === productId);

    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Product '${productId}' not found` },
        { status: 404 }
      );
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
