import { NextRequest, NextResponse } from "next/server";
import { forbidden, requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ workOrderId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["fitter", "manager"]);
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

    if (
      guard.user.role === "fitter" &&
      workOrder.assignedUserId !== guard.user.id
    ) {
      return forbidden("This work order is assigned to another engineer.");
    }

    const assetsCol = await collections.assets();
    const asset = await assetsCol.findOne({ id: workOrder.assetId });

    const proofCol = await collections.proofRecords();
    const proofs = await proofCol.find({ workOrderId }).toArray();

    const { _id, internalNotes, ...mobileData } = workOrder;

    return NextResponse.json({
      ...mobileData,
      assetName: asset?.name ?? workOrder.assetId,
      proofRecords: proofs.map(({ _id: proofObjectId, ...p }) => p),
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
