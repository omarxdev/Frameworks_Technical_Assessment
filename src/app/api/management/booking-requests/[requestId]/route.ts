import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { ManagementDecisionSchema } from "@/lib/schemas";
import { evaluateExclusiveAssetAvailability } from "@/lib/domain/availability/exclusiveAsset";
import { evaluateCapacityPoolAvailability } from "@/lib/domain/availability/capacityPool";
import { FIXTURE_CLOCK, FIXTURE_CLOCK_DATE } from "@/lib/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const requestsCol = await collections.bookingRequests();
    const request = await requestsCol.findOne({ id: requestId });

    if (!request) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Booking request '${requestId}' not found` },
        { status: 404 }
      );
    }

    const [
      productsDocs,
      orgsDocs,
      mediaOwnersDocs,
      locationsDocs,
      assetsDocs,
      capacityPoolsDocs,
      bookingsDocs,
      holdsDocs,
      outagesDocs,
    ] = await Promise.all([
      (await collections.products()).find({}).toArray(),
      (await collections.organisations()).find({}).toArray(),
      (await collections.mediaOwners()).find({}).toArray(),
      (await collections.locations()).find({}).toArray(),
      (await collections.assets()).find({}).toArray(),
      (await collections.capacityPools()).find({}).toArray(),
      (await collections.bookings()).find({}).toArray(),
      (await collections.holds()).find({}).toArray(),
      (await collections.outages()).find({}).toArray(),
    ]);

    const product = productsDocs.find((p) => p.id === request.productId);
    const org = orgsDocs.find((o) => o.id === request.organisationId);

    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Product '${request.productId}' not found` },
        { status: 404 }
      );
    }

    const mediaOwnersMap = new Map(mediaOwnersDocs.map((mo) => [mo.id, mo.name]));
    const locationsMap = new Map(locationsDocs.map((loc) => [loc.id, loc.name]));

    let availabilitySummary;
    if (product.allocationModel === "exclusive_asset") {
      const result = evaluateExclusiveAssetAvailability({
        productId: product.id,
        startDate: request.startDate,
        endDate: request.endDate,
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
        startDate: request.startDate,
        endDate: request.endDate,
        pools: capacityPoolsDocs,
        bookings: bookingsDocs,
        holds: holdsDocs,
        clock: FIXTURE_CLOCK_DATE,
      });
      availabilitySummary = result.summary;
    }

    const { _id, ...requestData } = request;

    return NextResponse.json({
      ...requestData,
      organisation: org
        ? (({ _id, ...o }) => o)(org)
        : {
            id: request.organisationId,
            name: request.advertiser?.name || request.organisationId,
            createdAt: request.createdAt,
            contractCount: 0,
          },
      product: {
        id: product.id,
        name: product.name,
        mediaOwnerName: mediaOwnersMap.get(product.mediaOwnerId) || "Island Media Co",
        mediaType: product.mediaType,
        locationNames: product.locationIds.map((id) => locationsMap.get(id) || id),
        allocationModel: product.allocationModel,
        indicativeRate: product.indicativeRate,
        minimumTermDays: product.minimumTermDays,
        availability: availabilitySummary,
      },
      currentAvailability: availabilitySummary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "REQUEST_DETAIL_FAILED", message: error.message || "Failed to fetch request detail" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const auth = await resolveAuth(req);
    const actorName = auth.user?.name || "Manager";

    const { requestId } = await params;
    const requestsCol = await collections.bookingRequests();
    const request = await requestsCol.findOne({ id: requestId });

    if (!request) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Booking request '${requestId}' not found` },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parseResult = ManagementDecisionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid management decision", details: parseResult.error.flatten() },
        { status: 422 }
      );
    }

    const { action, note, selectedAssetId } = parseResult.data;

    let targetStatus: "submitted" | "information_required" | "approved" | "declined" = request.status;

    if (action === "approve") {
      // Recheck availability
      const [productsDocs, assetsDocs, capacityPoolsDocs, bookingsDocs, holdsDocs, outagesDocs] =
        await Promise.all([
          (await collections.products()).find({}).toArray(),
          (await collections.assets()).find({}).toArray(),
          (await collections.capacityPools()).find({}).toArray(),
          (await collections.bookings()).find({}).toArray(),
          (await collections.holds()).find({}).toArray(),
          (await collections.outages()).find({}).toArray(),
        ]);

      const product = productsDocs.find((p) => p.id === request.productId);
      if (!product) {
        return NextResponse.json(
          { code: "NOT_FOUND", message: `Product '${request.productId}' not found` },
          { status: 404 }
        );
      }

      let isAvailable = false;
      let availReason = "";

      if (product.allocationModel === "exclusive_asset") {
        const result = evaluateExclusiveAssetAvailability({
          productId: product.id,
          startDate: request.startDate,
          endDate: request.endDate,
          assets: assetsDocs,
          bookings: bookingsDocs,
          holds: holdsDocs,
          outages: outagesDocs,
          clock: FIXTURE_CLOCK_DATE,
        });
        isAvailable = result.summary.state !== "unavailable";
        availReason = result.summary.reason;

        // If specific asset requested or selected, check that specific asset
        if (selectedAssetId) {
          const specificAsset = result.assetOptions.find((a) => a.id === selectedAssetId);
          if (!specificAsset || specificAsset.availability.state === "unavailable") {
            isAvailable = false;
            availReason = `Selected asset '${selectedAssetId}' is unavailable for the requested dates.`;
          }
        }
      } else {
        const result = evaluateCapacityPoolAvailability({
          productId: product.id,
          startDate: request.startDate,
          endDate: request.endDate,
          pools: capacityPoolsDocs,
          bookings: bookingsDocs,
          holds: holdsDocs,
          clock: FIXTURE_CLOCK_DATE,
        });
        isAvailable = result.summary.state === "available";
        availReason = result.summary.reason;
      }

      if (!isAvailable) {
        return NextResponse.json(
          {
            code: "INVENTORY_CONFLICT",
            message: `Cannot approve request due to inventory conflict: ${availReason}`,
          },
          { status: 409 }
        );
      }

      targetStatus = "approved";
    } else if (action === "request_information") {
      targetStatus = "information_required";
    } else if (action === "decline") {
      targetStatus = "declined";
    }

    const updatedHistory = [
      ...request.history,
      {
        at: FIXTURE_CLOCK,
        actor: actorName,
        action: targetStatus,
        note: note || `Manager decision: ${action}`,
      },
    ];

    await requestsCol.updateOne(
      { id: requestId },
      {
        $set: {
          status: targetStatus,
          requestedAssetId: selectedAssetId || request.requestedAssetId,
          history: updatedHistory,
        },
      }
    );

    const updatedDoc = await requestsCol.findOne({ id: requestId });
    const { _id, ...updatedRequestData } = updatedDoc!;

    return NextResponse.json(updatedRequestData, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { code: "DECISION_FAILED", message: error.message || "Failed to record management decision" },
      { status: 500 }
    );
  }
}
