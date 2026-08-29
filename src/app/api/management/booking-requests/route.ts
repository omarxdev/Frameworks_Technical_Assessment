import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { BookingRequestStatusSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const requestsCol = await collections.bookingRequests();
    const parsedStatus = BookingRequestStatusSchema.safeParse(status);
    const query = parsedStatus.success ? { status: parsedStatus.data } : {};
    const requestsDocs = await requestsCol.find(query).sort({ createdAt: -1 }).toArray();

    const [productsDocs, orgsDocs] = await Promise.all([
      (await collections.products()).find({}).toArray(),
      (await collections.organisations()).find({}).toArray(),
    ]);

    const productsMap = new Map(productsDocs.map((p) => [p.id, p.name]));
    const orgsMap = new Map(orgsDocs.map((o) => [o.id, o.name]));

    const items = requestsDocs.map((r) => {
      const productName = productsMap.get(r.productId) || r.productId;
      const organisationName = orgsMap.get(r.organisationId) || r.advertiser?.name || r.organisationId;

      let attentionReason: string | null = null;
      if (r.status === "submitted") {
        attentionReason = "Requires manager review and availability confirmation";
      } else if (r.status === "information_required") {
        attentionReason = "Awaiting client clarification";
      }

      return {
        id: r.id,
        organisationName,
        productName,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        createdAt: r.createdAt,
        attentionReason,
      };
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { code: "REQUESTS_FETCH_FAILED", message: error.message || "Failed to list booking requests" },
      { status: 500 }
    );
  }
}
