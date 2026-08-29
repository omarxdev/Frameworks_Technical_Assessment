import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { BookingRequestCreateSchema } from "@/lib/schemas";
import { validateIdempotencyKey } from "@/lib/domain/idempotency";
import { isValidDateRange } from "@/lib/domain/availability/dateRange";
import { FIXTURE_CLOCK } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req);
    if (!auth.user || !auth.user.organisationId) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Client organization account is required to submit a booking request." },
        { status: 403 }
      );
    }

    const idempotencyKey =
      req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key");
    if (!validateIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "A valid Idempotency-Key header (min 8 characters) is required.",
        },
        { status: 422 }
      );
    }

    // Check idempotency cache
    const idempCol = await collections.idempotencyKeys();
    const cached = await idempCol.findOne({ key: idempotencyKey! });
    if (cached) {
      return NextResponse.json(cached.response, { status: 200 });
    }

    const body = await req.json();
    const parseResult = BookingRequestCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid booking request parameters",
          details: parseResult.error.flatten(),
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;
    if (!isValidDateRange(data.startDate, data.endDate)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "startDate must be strictly before endDate" },
        { status: 422 }
      );
    }

    // Check product exists
    const productsCol = await collections.products();
    const product = await productsCol.findOne({ id: data.productId });
    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Product '${data.productId}' not found` },
        { status: 404 }
      );
    }

    const requestId = `request-${Date.now().toString().slice(-6)}`;
    const newRequest = {
      _id: requestId,
      id: requestId,
      organisationId: auth.user.organisationId,
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
          actor: auth.user.name,
          action: "submitted",
          note: null,
        },
      ],
      advertiser: {
        name: auth.organisation?.name || auth.user.name,
        contactName: auth.user.name,
        email: auth.user.email,
      },
    };

    const requestsCol = await collections.bookingRequests();
    await requestsCol.insertOne(newRequest);

    const { _id, ...responsePayload } = newRequest;

    // Cache idempotency response
    await idempCol.insertOne({
      _id: `idemp-${idempotencyKey}`,
      key: idempotencyKey!,
      response: responsePayload,
      createdAt: FIXTURE_CLOCK,
    });

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { code: "REQUEST_SUBMISSION_FAILED", message: error.message || "Failed to submit booking request" },
      { status: 500 }
    );
  }
}
