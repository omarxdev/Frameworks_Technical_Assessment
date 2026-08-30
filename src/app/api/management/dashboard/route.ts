import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { isVerificationStale } from "@/lib/domain/availability/exclusive-asset";
import { formatDay, formatMoment } from "@/lib/format";
import type { AttentionItem } from "@/lib/schemas";

export const GET = async (req: NextRequest) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const [
      requestsDocs,
      contractsDocs,
      campaignsDocs,
      workOrdersDocs,
      clientRequestsDocs,
      assetsDocs,
      productsDocs,
      organisationsDocs,
    ] = await Promise.all([
      (await collections.bookingRequests()).find({}).toArray(),
      (await collections.contracts()).find({}).toArray(),
      (await collections.campaigns()).find({}).toArray(),
      (await collections.workOrders()).find({}).toArray(),
      (await collections.clientRequests()).find({}).toArray(),
      (await collections.assets()).find({}).toArray(),
      (await collections.products()).find({}).toArray(),
      (await collections.organisations()).find({}).toArray(),
    ]);

    const productNames = new Map(productsDocs.map((p) => [p.id, p.name]));
    const organisationNames = new Map(organisationsDocs.map((o) => [o.id, o.name]));

    const attentionItems: AttentionItem[] = [];

    const submittedRequests = requestsDocs.filter((r) => r.status === "submitted");
    for (const request of submittedRequests) {
      const advertiser =
        organisationNames.get(request.organisationId) ??
        request.advertiser?.name ??
        request.organisationId;

      attentionItems.push({
        id: `att-req-${request.id}`,
        type: "booking_request",
        priority: "high",
        title: "New booking request",
        message: `${advertiser} asked for ${productNames.get(request.productId) ?? request.productId}, ${formatDay(request.startDate)} to ${formatDay(request.endDate)}.`,
        link: `/management/requests/${request.id}`,
        entityId: request.id,
      });
    }

    const blockedOrders = workOrdersDocs.filter((w) => w.status === "blocked");
    for (const workOrder of blockedOrders) {
      const blockedEntry = [...workOrder.history]
        .reverse()
        .find((entry) => entry.action === "blocked");

      attentionItems.push({
        id: `att-wo-${workOrder.id}`,
        type: "work_order_blocked",
        priority: "urgent",
        title: "Fitter blocked on site",
        message: `${workOrder.locationLabel}: ${blockedEntry?.note || "no reason recorded"}`,
        link: `/management/work-orders/${workOrder.id}`,
        entityId: workOrder.id,
      });
    }

    const pendingClientRequests = clientRequestsDocs.filter(
      (cr) => cr.status === "submitted"
    );
    for (const clientRequest of pendingClientRequests) {
      const isCancellation = clientRequest.type === "cancellation";
      const advertiser =
        organisationNames.get(clientRequest.organisationId) ??
        clientRequest.organisationId;

      attentionItems.push({
        id: `att-cr-${clientRequest.id}`,
        type: "client_change_request",
        priority: isCancellation ? "urgent" : "high",
        title: isCancellation ? "Client asked to cancel" : "Client asked for a change",
        message: `${advertiser}: ${clientRequest.summary || "No detail supplied"}`,
        link: `/management/contracts/${clientRequest.contractId}`,
        entityId: clientRequest.id,
      });
    }

    const staleAssets = assetsDocs.filter(
      (a) => a.status === "active" && isVerificationStale(a.verifiedAt)
    );
    for (const asset of staleAssets) {
      attentionItems.push({
        id: `att-asset-${asset.id}`,
        type: "stale_verification",
        priority: "normal",
        title: "Asset verification is stale",
        message: `${asset.name}: last verified ${asset.verifiedAt ? formatMoment(asset.verifiedAt) : "never"}.${asset.note ? ` ${asset.note}` : ""}`,
        entityId: asset.id,
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
      {
        code: "DASHBOARD_ERROR",
        message: error.message || "Failed to load management dashboard",
      },
      { status: 500 }
    );
  }
};
