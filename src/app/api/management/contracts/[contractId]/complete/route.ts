import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { canTransitionContract } from "@/lib/domain/contracts/state-machine";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newServiceEventId } from "@/lib/db/ids";
import { notFound } from "@/lib/api/responses";

export const POST = async (
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
      return notFound(`Contract '${contractId}' not found`);
    }

    if (!canTransitionContract(contract.status, "completed")) {
      return NextResponse.json(
        {
          code: "INVALID_TRANSITION",
          message: `A contract in '${contract.status}' status cannot be completed.`,
        },
        { status: 409 }
      );
    }

    const workOrdersCol = await collections.workOrders();
    const openWorkOrders = await workOrdersCol.countDocuments({
      contractId,
      status: { $ne: "completed" },
    });

    if (openWorkOrders > 0) {
      return NextResponse.json(
        {
          code: "WORK_ORDERS_OPEN",
          message: `${openWorkOrders} work order(s) on this contract are still open. Close them before completing the campaign.`,
        },
        { status: 409 }
      );
    }

    const note = await readNote(req);

    await contractsCol.updateOne(
      { id: contractId },
      {
        $set: { status: "completed" },
        $push: {
          history: {
            at: FIXTURE_CLOCK,
            actor: guard.user.name,
            action: "completed",
            note: note || "Campaign delivered and contract closed.",
          },
        },
      }
    );

    const campaignsCol = await collections.campaigns();
    await campaignsCol.updateOne(
      { contractId },
      { $set: { status: "completed", currentStage: "delivered" } }
    );

    const serviceEventsCol = await collections.serviceEvents();
    const eventId = newServiceEventId();
    await serviceEventsCol.insertOne({
      _id: eventId,
      id: eventId,
      organisationId: contract.organisationId,
      contractId,
      campaignId: null,
      workOrderId: null,
      at: FIXTURE_CLOCK,
      type: "contract_completed",
      title: "Campaign complete",
      clientVisible: true,
      clientSummary:
        "Your campaign has run its full term and the contract is now closed.",
    });

    const updated = await contractsCol.findOne({ id: contractId });
    const { _id, ...payload } = updated!;

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "COMPLETE_FAILED",
        message: error.message || "Failed to complete contract",
      },
      { status: 500 }
    );
  }
};

const readNote = async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.note !== "string") return "";
  return body.note.trim();
};
