import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workOrderId: string }> }
) {
  try {
    const auth = await resolveAuth(req);
    const { workOrderId } = await params;

    const workOrdersCol = await collections.workOrders();
    const wo = await workOrdersCol.findOne({ id: workOrderId });

    if (!wo) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Work order '${workOrderId}' not found` },
        { status: 404 }
      );
    }

    // Fetch related asset for location details
    const assetsCol = await collections.assets();
    const asset = await assetsCol.findOne({ id: wo.assetId });

    // Fetch proof records
    const proofCol = await collections.proofRecords();
    const proofs = await proofCol.find({ workOrderId }).toArray();

    const { _id, internalNotes, ...mobileData } = wo;

    return NextResponse.json({
      ...mobileData,
      assetName: asset?.name || wo.assetId,
      proofRecords: proofs.map(({ _id, ...p }) => p),
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "WORK_ORDER_DETAIL_FAILED", message: error.message || "Failed to fetch work order" },
      { status: 500 }
    );
  }
}
