import { NextRequest, NextResponse } from "next/server";
import { requireClientOrganisation } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export const GET = async (req: NextRequest) => {
  try {
    const guard = await requireClientOrganisation(req);
    if (!guard.ok) return guard.response;

    const auth = { user: guard.user, organisation: guard.organisation };

    const orgId = auth.organisation.id;

    const contractsCol = await collections.contracts();
    const orgContracts = await contractsCol.find({ organisationId: orgId }).toArray();

    const serviceEventsCol = await collections.serviceEvents();
    const serviceEvents = await serviceEventsCol
      .find({ organisationId: orgId, clientVisible: true })
      .sort({ at: -1 })
      .limit(10)
      .toArray();

    const clientRequestsCol = await collections.clientRequests();
    const clientRequests = await clientRequestsCol
      .find({ organisationId: orgId })
      .toArray();

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
      {
        code: "CLIENT_SUMMARY_FAILED",
        message: error.message || "Failed to get client summary",
      },
      { status: 500 }
    );
  }
};
