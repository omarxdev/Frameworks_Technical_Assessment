import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { WorkOrderStatusSchema } from "@/lib/schemas";

export const GET = async (req: NextRequest) => {
  try {
    const guard = await requireRole(req, ["fitter", "manager"]);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const parsedStatus = WorkOrderStatusSchema.safeParse(searchParams.get("status"));
    const assignedTo = searchParams.get("assignedUserId");

    const query: Record<string, unknown> = {};

    if (guard.user.role === "fitter") {
      query.assignedUserId = guard.user.id;
    } else if (assignedTo) {
      query.assignedUserId = assignedTo;
    }

    if (parsedStatus.success) query.status = parsedStatus.data;

    const workOrdersCol = await collections.workOrders();
    const docs = await workOrdersCol.find(query).sort({ scheduledStart: 1 }).toArray();

    const assetsCol = await collections.assets();
    const assets = await assetsCol.find({}).toArray();
    const assetNames = new Map(assets.map((a) => [a.id, a.name]));

    const items = docs.map(({ _id, internalNotes, ...wo }) => ({
      ...wo,
      assetName: assetNames.get(wo.assetId) ?? wo.assetId,
    }));

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "MOBILE_WORK_ORDERS_FAILED",
        message: error.message || "Failed to list mobile work orders",
      },
      { status: 500 }
    );
  }
};
