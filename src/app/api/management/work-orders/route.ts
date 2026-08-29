import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { WorkOrderCreateSchema } from "@/lib/schemas";
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
    const parseResult = WorkOrderCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid work order creation payload",
          details: parseResult.error.flatten(),
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    // Fetch contract to get organisationId
    const contractsCol = await collections.contracts();
    const contract = await contractsCol.findOne({ id: data.contractId });
    if (!contract) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Contract '${data.contractId}' not found` },
        { status: 404 }
      );
    }

    const workOrderId = `work-order-${Date.now().toString().slice(-4)}`;
    const newWorkOrder = {
      _id: workOrderId,
      id: workOrderId,
      campaignId: data.campaignId,
      contractId: data.contractId,
      organisationId: contract.organisationId,
      type: data.type,
      status: "assigned" as const,
      assignedUserId: data.assignedUserId,
      assetId: data.assetId,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      locationLabel: data.locationLabel,
      instructions: data.instructions,
      internalNotes: data.internalNotes || "",
      completionNote: null,
      proofRecordIds: [],
      history: [
        {
          at: FIXTURE_CLOCK,
          actor: actorName,
          action: "assigned",
          note: `Assigned to ${data.assignedUserId}.`,
        },
      ],
    };

    const workOrdersCol = await collections.workOrders();
    await workOrdersCol.insertOne(newWorkOrder);

    // Emit client-visible service event for scheduled installation
    const serviceEventsCol = await collections.serviceEvents();
    const eventId = `event-${Date.now().toString().slice(-6)}`;
    await serviceEventsCol.insertOne({
      _id: eventId,
      id: eventId,
      organisationId: contract.organisationId,
      contractId: data.contractId,
      campaignId: data.campaignId,
      workOrderId,
      at: FIXTURE_CLOCK,
      type: "installation_scheduled",
      title: "Installation scheduled",
      clientVisible: true,
      clientSummary: `Installation is planned for ${new Date(data.scheduledStart).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`,
    });

    const { _id, ...responsePayload } = newWorkOrder;

    await idempCol.insertOne({
      _id: `idemp-${idempotencyKey}`,
      key: idempotencyKey!,
      response: responsePayload,
      createdAt: FIXTURE_CLOCK,
    });

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { code: "WORK_ORDER_CREATE_FAILED", message: error.message || "Failed to create work order" },
      { status: 500 }
    );
  }
}
