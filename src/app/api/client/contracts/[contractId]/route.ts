import { NextRequest, NextResponse } from "next/server";
import { forbidden, requireClientOrganisation } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { notFound } from "@/lib/api/responses";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) => {
  try {
    const guard = await requireClientOrganisation(req);
    if (!guard.ok) return guard.response;

    const auth = { user: guard.user, organisation: guard.organisation };

    const { contractId } = await params;
    const contractsCol = await collections.contracts();
    const contract = await contractsCol.findOne({ id: contractId });

    if (!contract) {
      return notFound(`Contract '${contractId}' not found`);
    }

    if (contract.organisationId !== auth.organisation.id) {
      return forbidden("You cannot access this organisation's record.");
    }

    const campaignsCol = await collections.campaigns();
    const campaignDoc = await campaignsCol.findOne({ contractId });

    const serviceEventsCol = await collections.serviceEvents();
    const serviceEvents = await serviceEventsCol
      .find({ contractId, clientVisible: true })
      .sort({ at: 1 })
      .toArray();

    const proofRecordsCol = await collections.proofRecords();
    const workOrdersCol = await collections.workOrders();
    const relatedWorkOrders = await workOrdersCol.find({ contractId }).toArray();
    const completedWorkOrderIds = relatedWorkOrders
      .filter((wo) => wo.status === "completed")
      .map((wo) => wo.id);

    const proofRecords = await proofRecordsCol
      .find({ workOrderId: { $in: completedWorkOrderIds } })
      .toArray();

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
      {
        code: "CONTRACT_FETCH_FAILED",
        message: error.message || "Failed to fetch contract",
      },
      { status: 500 }
    );
  }
};
