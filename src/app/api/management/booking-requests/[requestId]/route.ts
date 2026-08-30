import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { ManagementDecisionSchema } from "@/lib/schemas";
import {
  checkAvailability,
  describeAvailability,
  loadInventory,
} from "@/lib/domain/availability/recheck";
import { FIXTURE_CLOCK } from "@/lib/constants";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const { requestId } = await params;
    const requestsCol = await collections.bookingRequests();
    const request = await requestsCol.findOne({ id: requestId });

    if (!request) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Booking request '${requestId}' not found` },
        { status: 404 }
      );
    }

    const [inventory, orgsDocs, mediaOwnersDocs, locationsDocs] = await Promise.all([
      loadInventory(),
      (await collections.organisations()).find({}).toArray(),
      (await collections.mediaOwners()).find({}).toArray(),
      (await collections.locations()).find({}).toArray(),
    ]);

    const product = inventory.products.find((p) => p.id === request.productId);
    const org = orgsDocs.find((o) => o.id === request.organisationId);

    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Product '${request.productId}' not found` },
        { status: 404 }
      );
    }

    const mediaOwnersMap = new Map(mediaOwnersDocs.map((mo) => [mo.id, mo.name]));
    const locationsMap = new Map(locationsDocs.map((loc) => [loc.id, loc.name]));

    const { summary: availabilitySummary } = describeAvailability({
      inventory,
      productId: product.id,
      startDate: request.startDate,
      endDate: request.endDate,
    });

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
      {
        code: "REQUEST_DETAIL_FAILED",
        message: error.message || "Failed to fetch request detail",
      },
      { status: 500 }
    );
  }
};

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const actorName = guard.user.name;

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
        {
          code: "VALIDATION_ERROR",
          message: "Invalid management decision",
          details: parseResult.error.flatten(),
        },
        { status: 422 }
      );
    }

    const { action, note, selectedAssetId } = parseResult.data;

    let targetStatus: "submitted" | "information_required" | "approved" | "declined" =
      request.status;

    if (action === "approve") {
      const inventory = await loadInventory();
      const check = checkAvailability({
        inventory,
        productId: request.productId,
        startDate: request.startDate,
        endDate: request.endDate,
        selectedAssetId: selectedAssetId ?? request.requestedAssetId ?? null,
      });

      if (!check.allocatable) {
        return NextResponse.json(
          {
            code: "INVENTORY_CONFLICT",
            message: `Cannot approve this request: ${check.conflictReason}`,
            details: {
              availability: check.summary,
              blockers: check.summary.blockers ?? [],
            },
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
      {
        code: "DECISION_FAILED",
        message: error.message || "Failed to record management decision",
      },
      { status: 500 }
    );
  }
};
