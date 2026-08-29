import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuth(req);
    if (!auth.user || !auth.organisation) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Client organization session is required." },
        { status: 403 }
      );
    }

    const orgId = auth.organisation.id;

    // Fetch contracts for this organisation only
    const contractsCol = await collections.contracts();
    const orgContracts = await contractsCol.find({ organisationId: orgId }).toArray();

    // Fetch service events for this organisation
    const serviceEventsCol = await collections.serviceEvents();
    const serviceEvents = await serviceEventsCol
      .find({ organisationId: orgId, clientVisible: true })
      .sort({ at: -1 })
      .limit(10)
      .toArray();

    // Fetch client requests
    const clientRequestsCol = await collections.clientRequests();
    const clientRequests = await clientRequestsCol.find({ organisationId: orgId }).toArray();

    // Compute contract summaries
    const contractSummaries = orgContracts.map((c) => {
      let actionRequired: string | null = null;
      if (c.status === "issued") {
        actionRequired = "Review and accept your issued advertising contract";
      } else if (c.status === "change_requested") {
        actionRequired = "Awaiting management review of your requested changes";
      }

      return {
        id: c.id,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        total: c.total,
        actionRequired,
      };
    });

    // Compute attention items for client
    const attentionItems: any[] = [];
    for (const c of orgContracts) {
      if (c.status === "issued") {
        attentionItems.push({
          type: "contract_issued",
          title: "Contract Ready for Review",
          message: `Contract ${c.id} (£${c.total.toLocaleString()}) is awaiting your acceptance.`,
          contractId: c.id,
          priority: "high",
        });
      }
    }

    const pendingRequests = clientRequests.filter((r) => r.status === "submitted");
    for (const r of pendingRequests) {
      attentionItems.push({
        type: "request_pending",
        title: "Change Request Under Review",
        message: `Your request "${r.summary || "Contract update"}" is being reviewed by management.`,
        contractId: r.contractId,
        priority: "normal",
      });
    }

    return NextResponse.json({
      organisation: {
        id: auth.organisation.id,
        name: auth.organisation.name,
        createdAt: auth.organisation.createdAt,
        contractCount: orgContracts.length,
      },
      contracts: contractSummaries,
      attentionItems,
      recentServiceEvents: serviceEvents.map(({ _id, ...rest }) => rest),
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "CLIENT_SUMMARY_FAILED", message: error.message || "Failed to get client summary" },
      { status: 500 }
    );
  }
}
