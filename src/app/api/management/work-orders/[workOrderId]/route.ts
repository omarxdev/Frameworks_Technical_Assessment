import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ workOrderId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const { workOrderId } = await params;
    const workOrdersCol = await collections.workOrders();
    const workOrder = await workOrdersCol.findOne({ id: workOrderId });

    if (!workOrder) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Work order '${workOrderId}' not found` },
        { status: 404 }
      );
    }

    const [assetDoc, assigneeDoc, organisationDoc, campaignDoc, proofDocs, eventDocs] =
      await Promise.all([
        (await collections.assets()).findOne({ id: workOrder.assetId }),
        (await collections.users()).findOne({ id: workOrder.assignedUserId }),
        (await collections.organisations()).findOne({
          id: workOrder.organisationId,
        }),
        (await collections.campaigns()).findOne({ id: workOrder.campaignId }),
        (await collections.proofRecords()).find({ workOrderId }).toArray(),
        (await collections.serviceEvents())
          .find({ workOrderId })
          .sort({ at: 1 })
          .toArray(),
      ]);

    const { _id, ...workOrderData } = workOrder;

    return NextResponse.json({
      ...workOrderData,
      assetName: assetDoc?.name ?? workOrder.assetId,
      assignedUserName: assigneeDoc?.name ?? workOrder.assignedUserId,
      organisationName: organisationDoc?.name ?? workOrder.organisationId,
      campaignName: campaignDoc?.name ?? null,
      proofRecords: proofDocs.map(({ _id: proofId, ...proof }) => proof),
      serviceEvents: eventDocs.map(({ _id: eventId, ...event }) => event),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "WORK_ORDER_DETAIL_FAILED",
        message: error.message || "Failed to fetch work order",
      },
      { status: 500 }
    );
  }
};
