import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const { contractId } = await params;
    const contractsCol = await collections.contracts();
    const contract = await contractsCol.findOne({ id: contractId });

    if (!contract) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Contract '${contractId}' not found` },
        { status: 404 }
      );
    }

    const [orgDoc, campaignDoc, workOrderDocs, serviceEventDocs, clientRequestDocs] =
      await Promise.all([
        (await collections.organisations()).findOne({ id: contract.organisationId }),
        (await collections.campaigns()).findOne({ contractId }),
        (await collections.workOrders()).find({ contractId }).toArray(),
        (await collections.serviceEvents())
          .find({ contractId })
          .sort({ at: 1 })
          .toArray(),
        (await collections.clientRequests()).find({ contractId }).toArray(),
      ]);

    const workOrderIds = workOrderDocs.map((wo) => wo.id);
    const proofDocs = await (
      await collections.proofRecords()
    )
      .find({ workOrderId: { $in: workOrderIds } })
      .toArray();

    const { _id, ...contractData } = contract;

    return NextResponse.json({
      ...contractData,
      organisationName: orgDoc?.name ?? contract.organisationId,
      campaign: campaignDoc ? (({ _id: campaignId, ...c }) => c)(campaignDoc) : null,
      workOrders: workOrderDocs.map(({ _id: workOrderId, ...wo }) => ({
        ...wo,
        proofRecords: proofDocs
          .filter((p) => p.workOrderId === wo.id)
          .map(({ _id: proofId, ...p }) => p),
      })),
      proofRecords: proofDocs.map(({ _id: proofId, ...p }) => p),
      serviceEvents: serviceEventDocs.map(({ _id: eventId, ...se }) => se),
      clientRequests: clientRequestDocs.map(({ _id: requestId, ...cr }) => cr),
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
