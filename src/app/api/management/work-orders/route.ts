import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { WorkOrderCreateSchema } from "@/lib/schemas";
import {
  missingKeyResponse,
  readIdempotencyKey,
  validateIdempotencyKey,
  withIdempotency,
} from "@/lib/domain/idempotency";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newServiceEventId, newWorkOrderId } from "@/lib/ids";

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const actorName = guard.user.name;

    const key = readIdempotencyKey(req);
    if (!validateIdempotencyKey(key)) return missingKeyResponse();

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

    const idempotency = await withIdempotency({
      scope: "management-work-order-create",
      actorId: guard.user.id,
      key: key!,
      body: data,
    });
    if (idempotency.kind !== "proceed") return idempotency.response;

    const workOrderId = newWorkOrderId();
    const newWorkOrder = {
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
    await workOrdersCol.insertOne({ _id: workOrderId, ...newWorkOrder });

    // Emit client-visible service event for scheduled installation
    const serviceEventsCol = await collections.serviceEvents();
    const eventId = newServiceEventId();
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

    await idempotency.commit(newWorkOrder, 201);
    return NextResponse.json(newWorkOrder, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { code: "WORK_ORDER_CREATE_FAILED", message: error.message || "Failed to create work order" },
      { status: 500 }
    );
  }
}
