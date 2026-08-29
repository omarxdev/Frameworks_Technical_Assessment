import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { isVerificationStale } from "@/lib/domain/availability/exclusiveAsset";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const [requestsDocs, contractsDocs, campaignsDocs, workOrdersDocs, clientRequestsDocs, assetsDocs] =
      await Promise.all([
        (await collections.bookingRequests()).find({}).toArray(),
        (await collections.contracts()).find({}).toArray(),
        (await collections.campaigns()).find({}).toArray(),
        (await collections.workOrders()).find({}).toArray(),
        (await collections.clientRequests()).find({}).toArray(),
        (await collections.assets()).find({}).toArray(),
      ]);

    const attentionItems: any[] = [];

    // 1. Pending booking requests
    const submittedRequests = requestsDocs.filter((r) => r.status === "submitted");
    for (const r of submittedRequests) {
      attentionItems.push({
        id: `att-req-${r.id}`,
        type: "booking_request",
        priority: "high",
        title: "New Booking Request",
        message: `${r.advertiser?.name || r.organisationId} submitted a request for ${r.productId} (${r.startDate} to ${r.endDate})`,
        link: `/management/requests/${r.id}`,
        entityId: r.id,
      });
    }

    // 2. Blocked work orders
    const blockedOrders = workOrdersDocs.filter((w) => w.status === "blocked");
    for (const w of blockedOrders) {
      const blockedEntry = [...w.history]
        .reverse()
        .find((h) => h.action === "blocked");

      attentionItems.push({
        id: `att-wo-${w.id}`,
        type: "work_order_blocked",
        priority: "urgent",
        title: "Fitter work order blocked",
        message: `${w.locationLabel}: ${blockedEntry?.note || "no reason recorded"}`,
        link: `/management/work-orders/${w.id}`,
        entityId: w.id,
      });
    }

    // 3. Client change requests
    const pendingChanges = clientRequestsDocs.filter((cr) => cr.status === "submitted");
    for (const cr of pendingChanges) {
      attentionItems.push({
        id: `att-cr-${cr.id}`,
        type: "client_change_request",
        priority: "high",
        title: "Client Change Request",
        message: `Contract ${cr.contractId}: "${cr.summary || "Change requested"}"`,
        link: `/management/contracts/${cr.contractId}`,
        entityId: cr.id,
      });
    }

    // 4. Stale verification warnings
    const staleAssets = assetsDocs.filter(
      (a) => a.status === "active" && isVerificationStale(a.verifiedAt)
    );
    for (const sa of staleAssets) {
      attentionItems.push({
        id: `att-asset-${sa.id}`,
        type: "stale_verification",
        priority: "normal",
        title: "Asset verification is stale",
        message: `${sa.name}: last verified ${sa.verifiedAt ?? "never"}.${sa.note ? ` ${sa.note}` : ""}`,
        entityId: sa.id,
      });
    }

    const counts = {
      pendingRequests: submittedRequests.length,
      activeContracts: contractsDocs.filter((c) => c.status === "active").length,
      issuedContracts: contractsDocs.filter((c) => c.status === "issued").length,
      activeCampaigns: campaignsDocs.filter((c) => c.status === "active").length,
      openWorkOrders: workOrdersDocs.filter((w) => w.status !== "completed").length,
      blockedWorkOrders: blockedOrders.length,
    };

    return NextResponse.json({
      attentionItems,
      counts,
      upcomingWorkOrders: workOrdersDocs.map(({ _id, ...wo }) => wo),
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "DASHBOARD_ERROR", message: error.message || "Failed to load management dashboard" },
      { status: 500 }
    );
  }
}
