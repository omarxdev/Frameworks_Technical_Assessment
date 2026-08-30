import { NextRequest, NextResponse } from "next/server";
import { forbidden, requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { WorkOrderStatusUpdateSchema } from "@/lib/schemas";
import { validateWorkOrderStatusUpdate } from "@/lib/domain/work-orders/state-machine";
import {
  missingKeyResponse,
  readIdempotencyKey,
  validateIdempotencyKey,
  withIdempotency,
} from "@/lib/api/idempotency";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newServiceEventId } from "@/lib/db/ids";
import { notFound, validationError } from "@/lib/api/responses";

const clientSummaryFor = (status: string, assetName: string) => {
  if (status === "travelling") return `An engineer is on the way to ${assetName}.`;
  if (status === "on_site") return `An engineer has arrived at ${assetName}.`;
  if (status === "completed") return `Work at ${assetName} is complete.`;
  return null;
};

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ workOrderId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["fitter", "manager"]);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!validateIdempotencyKey(key)) return missingKeyResponse();

    const { workOrderId } = await params;
    const workOrdersCol = await collections.workOrders();
    const workOrder = await workOrdersCol.findOne({ id: workOrderId });

    if (!workOrder) {
      return notFound(`Work order '${workOrderId}' not found`);
    }

    if (guard.user.role === "fitter" && workOrder.assignedUserId !== guard.user.id) {
      return forbidden("This work order is assigned to another engineer.");
    }

    const body = await req.json();
    const parsed = WorkOrderStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError("Invalid work order status update", parsed.error.flatten());
    }

    const idempotency = await withIdempotency({
      scope: `work-order-status:${workOrderId}`,
      actorId: guard.user.id,
      key: key!,
      body: parsed.data,
    });
    if (idempotency.kind !== "proceed") return idempotency.response;

    const { status, note } = parsed.data;

    const proofCol = await collections.proofRecords();
    const proofCount = await proofCol.countDocuments({ workOrderId });

    const check = validateWorkOrderStatusUpdate(workOrder.status, status, {
      note,
      completionNote: workOrder.completionNote,
      proofCount,
    });

    if (!check.valid) {
      const status = check.code === "INVALID_TRANSITION" ? 409 : 422;
      return NextResponse.json({ code: check.code, message: check.error }, { status });
    }

    const historyEntry = {
      at: FIXTURE_CLOCK,
      actor: guard.user.name,
      action: status,
      note: note?.trim() || null,
    };

    await workOrdersCol.updateOne(
      { id: workOrderId },
      {
        $set: { status },
        $push: { history: historyEntry },
      }
    );

    const assetsCol = await collections.assets();
    const asset = await assetsCol.findOne({ id: workOrder.assetId });
    const assetName = asset?.name || workOrder.locationLabel;

    const clientSummary = clientSummaryFor(status, assetName);
    const serviceEventsCol = await collections.serviceEvents();
    const eventId = newServiceEventId();

    await serviceEventsCol.insertOne({
      _id: eventId,
      id: eventId,
      organisationId: workOrder.organisationId,
      contractId: workOrder.contractId,
      campaignId: workOrder.campaignId,
      workOrderId,
      at: FIXTURE_CLOCK,
      type: `work_order_${status}`,
      title: `Work order ${status.replace(/_/g, " ")}`,
      clientVisible: clientSummary !== null,
      clientSummary,
    });

    const updated = await workOrdersCol.findOne({ id: workOrderId });
    const { _id, internalNotes, ...payload } = updated!;

    await idempotency.commit(payload, 200);
    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "STATUS_UPDATE_FAILED",
        message: error.message || "Failed to update work order status",
      },
      { status: 500 }
    );
  }
};
