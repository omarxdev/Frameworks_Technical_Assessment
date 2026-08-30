import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { ContractCreateSchema } from "@/lib/schemas";
import {
  missingKeyResponse,
  readIdempotencyKey,
  validateIdempotencyKey,
  withIdempotency,
} from "@/lib/api/idempotency";
import { isValidDateRange } from "@/lib/domain/availability/date-range";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newContractId } from "@/lib/db/ids";
import { notFound, validationError } from "@/lib/api/responses";

export const POST = async (req: NextRequest) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!validateIdempotencyKey(key)) return missingKeyResponse();

    const body = await req.json();
    const parsed = ContractCreateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError("Invalid contract creation parameters", parsed.error.flatten());
    }

    const data = parsed.data;

    if (!isValidDateRange(data.startDate, data.endDate)) {
      return validationError("startDate must be strictly before endDate");
    }

    const orgsCol = await collections.organisations();
    const org = await orgsCol.findOne({ id: data.organisationId });
    if (!org) {
      return notFound(`Organisation '${data.organisationId}' not found`);
    }

    const idempotency = await withIdempotency({
      scope: "management-contract-create",
      actorId: guard.user.id,
      key: key!,
      body: data,
    });
    if (idempotency.kind !== "proceed") return idempotency.response;

    const contractId = newContractId();
    const contract = {
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
      bookingIds: [],
      history: [
        {
          at: FIXTURE_CLOCK,
          actor: guard.user.name,
          action: "draft_created",
          note: "Draft contract prepared by management.",
        },
      ],
    };

    const contractsCol = await collections.contracts();
    await contractsCol.insertOne({ _id: contractId, ...contract });

    if (data.bookingRequestId) {
      const requestsCol = await collections.bookingRequests();
      await requestsCol.updateOne(
        { id: data.bookingRequestId },
        { $set: { draftContractId: contractId } }
      );
    }

    await idempotency.commit(contract, 201);
    return NextResponse.json(contract, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "CONTRACT_CREATE_FAILED",
        message: error.message || "Failed to create draft contract",
      },
      { status: 500 }
    );
  }
};
