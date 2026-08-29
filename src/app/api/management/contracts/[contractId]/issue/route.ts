import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { FIXTURE_CLOCK } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const auth = await resolveAuth(req);
    const actorName = auth.user?.name || "Manager";

    const { contractId } = await params;
    const contractsCol = await collections.contracts();
    const contract = await contractsCol.findOne({ id: contractId });

    if (!contract) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Contract '${contractId}' not found` },
        { status: 404 }
      );
    }

    if (contract.status !== "draft") {
      return NextResponse.json(
        { code: "CONFLICT", message: `Contract is in '${contract.status}' status and cannot be issued.` },
        { status: 409 }
      );
    }

    const updatedContract = {
      ...contract,
      status: "issued" as const,
      issuedAt: FIXTURE_CLOCK,
      history: [
        ...contract.history,
        {
          at: FIXTURE_CLOCK,
          actor: actorName,
          action: "issued",
          note: "Contract issued to client for review.",
        },
      ],
    };

    await contractsCol.updateOne({ id: contractId }, { $set: updatedContract });

    // Create client-visible service event
    const serviceEventsCol = await collections.serviceEvents();
    const eventId = `event-${Date.now().toString().slice(-6)}`;
    await serviceEventsCol.insertOne({
      _id: eventId,
      id: eventId,
      organisationId: contract.organisationId,
      contractId,
      campaignId: null,
      workOrderId: null,
      at: FIXTURE_CLOCK,
      type: "contract_issued",
      title: "Contract ready for review",
      clientVisible: true,
      clientSummary: "Your contract is ready to review.",
    });

    const { _id, ...responsePayload } = updatedContract;
    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { code: "ISSUE_FAILED", message: error.message || "Failed to issue contract" },
      { status: 500 }
    );
  }
}
