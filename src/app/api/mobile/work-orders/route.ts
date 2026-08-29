import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuth(req);
    const fitterId = auth.user?.id || "user-fitter-01"; // Fallback to prototype fitter if unauthenticated

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const workOrdersCol = await collections.workOrders();
    const query: any = { assignedUserId: fitterId };
    if (status) {
      query.status = status;
    }

    const docs = await workOrdersCol.find(query).sort({ scheduledStart: 1 }).toArray();
    const items = docs.map(({ _id, internalNotes, ...wo }) => wo);

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { code: "MOBILE_WORK_ORDERS_FAILED", message: error.message || "Failed to list mobile work orders" },
      { status: 500 }
    );
  }
}
