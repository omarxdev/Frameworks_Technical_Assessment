import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const auth = await resolveAuth(req);
    if (!auth.user || !auth.organisation) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Client organization session is required." },
        { status: 403 }
      );
    }

    const { contractId } = await params;
    const contractsCol = await collections.contracts();
    const contract = await contractsCol.findOne({ id: contractId });

    if (!contract) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Contract '${contractId}' not found` },
        { status: 404 }
      );
    }

    // MULTI-TENANT ISOLATION CHECK:
    // Client organisation A cannot view organisation B's contract
    if (contract.organisationId !== auth.organisation.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "You cannot access this organisation's record." },
        { status: 403 }
      );
    }

    // Fetch connected campaign
    const campaignsCol = await collections.campaigns();
    const campaignDoc = await campaignsCol.findOne({ contractId });

    // Fetch clientVisible service events
    const serviceEventsCol = await collections.serviceEvents();
    const serviceEvents = await serviceEventsCol
      .find({ contractId, clientVisible: true })
      .sort({ at: 1 })
      .toArray();

    // Fetch proof records
    const proofRecordsCol = await collections.proofRecords();
    const workOrdersCol = await collections.workOrders();
    const relatedWorkOrders = await workOrdersCol.find({ contractId }).toArray();
    const workOrderIds = relatedWorkOrders.map((wo) => wo.id);

    const proofRecords = await proofRecordsCol
      .find({ workOrderId: { $in: workOrderIds } })
      .toArray();

    // Fetch client requests
    const clientRequestsCol = await collections.clientRequests();
    const clientRequests = await clientRequestsCol.find({ contractId }).toArray();

    const { _id, ...contractData } = contract;

    return NextResponse.json({
      ...contractData,
      campaign: campaignDoc ? (({ _id, ...c }) => c)(campaignDoc) : null,
      serviceEvents: serviceEvents.map(({ _id, ...se }) => se),
      proofRecords: proofRecords.map(({ _id, ...pr }) => pr),
      clientRequests: clientRequests.map(({ _id, ...cr }) => cr),
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "CONTRACT_FETCH_FAILED", message: error.message || "Failed to fetch contract" },
      { status: 500 }
    );
  }
}
