import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { ContractCreateSchema } from "@/lib/schemas";
import { validateIdempotencyKey } from "@/lib/domain/idempotency";
import { FIXTURE_CLOCK } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req);
    const actorName = auth.user?.name || "Manager";

    const idempotencyKey =
      req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key");
    if (!validateIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "A valid Idempotency-Key header is required.",
        },
        { status: 422 }
      );
    }

    const idempCol = await collections.idempotencyKeys();
    const cached = await idempCol.findOne({ key: idempotencyKey! });
    if (cached) {
      return NextResponse.json(cached.response, { status: 200 });
    }

    const body = await req.json();
    const parseResult = ContractCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid contract creation parameters",
          details: parseResult.error.flatten(),
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    const contractId = `contract-${Date.now().toString().slice(-4)}`;
    const newContract = {
      _id: contractId,
      id: contractId,
      organisationId: data.organisationId,
      bookingRequestId: data.bookingRequestId,
      status: "draft" as const,
      version: 1,
      startDate: data.startDate,
      endDate: data.endDate,
      currency: "GBP" as const,
      total: data.total,
      issuedAt: null,
      acceptedAt: null,
      activatedAt: null,
      items: data.items,
      history: [
        {
          at: FIXTURE_CLOCK,
          actor: actorName,
          action: "draft_created",
          note: "Draft contract prepared by management.",
        },
      ],
    };

    const contractsCol = await collections.contracts();
    await contractsCol.insertOne(newContract);

    // Update booking request with draft contract id
    if (data.bookingRequestId) {
      const requestsCol = await collections.bookingRequests();
      await requestsCol.updateOne(
        { id: data.bookingRequestId },
        { $set: { draftContractId: contractId } }
      );
    }

    const { _id, ...responsePayload } = newContract;

    await idempCol.insertOne({
      _id: `idemp-${idempotencyKey}`,
      key: idempotencyKey!,
      response: responsePayload,
      createdAt: FIXTURE_CLOCK,
    });

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { code: "CONTRACT_CREATE_FAILED", message: error.message || "Failed to create draft contract" },
      { status: 500 }
    );
  }
}
