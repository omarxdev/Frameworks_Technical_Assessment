import { NextRequest, NextResponse } from "next/server";
import { requireClientOrganisation } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { BookingRequestCreateSchema } from "@/lib/schemas";
import {
  missingKeyResponse,
  readIdempotencyKey,
  validateIdempotencyKey,
  withIdempotency,
} from "@/lib/domain/idempotency";
import { isValidDateRange } from "@/lib/domain/availability/date-range";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newRequestId } from "@/lib/ids";

export const POST = async (req: NextRequest) => {
  try {
    const guard = await requireClientOrganisation(req);
    if (!guard.ok) return guard.response;

    const { user, organisation } = guard;

    const key = readIdempotencyKey(req);
    if (!validateIdempotencyKey(key)) return missingKeyResponse();

    const body = await req.json();
    const parsed = BookingRequestCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid booking request parameters",
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const data = parsed.data;

    if (!isValidDateRange(data.startDate, data.endDate)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "startDate must be strictly before endDate",
        },
        { status: 422 }
      );
    }

    const productsCol = await collections.products();
    const product = await productsCol.findOne({ id: data.productId });
    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Product '${data.productId}' not found` },
        { status: 404 }
      );
    }

    const idempotency = await withIdempotency({
      scope: "booking-request-create",
      actorId: user.id,
      key: key!,
      body: data,
    });
    if (idempotency.kind !== "proceed") return idempotency.response;

    const requestId = newRequestId();
    const bookingRequest = {
      id: requestId,
      idempotencyKey: key ?? undefined,
      organisationId: organisation.id,
      productId: data.productId,
      requestedAssetId: data.requestedAssetId || null,
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      objective: data.objective,
      notes: data.notes || null,
      status: "submitted" as const,
      createdAt: FIXTURE_CLOCK,
      draftContractId: null,
      history: [
        {
          at: FIXTURE_CLOCK,
          actor: user.name,
          action: "submitted",
          note: null,
        },
      ],
      advertiser: {
        name: organisation.name,
        contactName: user.name,
        email: user.email,
      },
    };

    const requestsCol = await collections.bookingRequests();
    await requestsCol.insertOne({ _id: requestId, ...bookingRequest });

    await idempotency.commit(bookingRequest, 201);
    return NextResponse.json(bookingRequest, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "REQUEST_SUBMISSION_FAILED",
        message: error.message || "Failed to submit booking request",
      },
      { status: 500 }
    );
  }
};
