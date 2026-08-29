import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { canTransitionContract } from "@/lib/domain/contracts/stateMachine";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newCampaignId, newServiceEventId } from "@/lib/ids";

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
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Contract '${contractId}' not found` },
        { status: 404 }
      );
    }

    if (!canTransitionContract(contract.status, "issued")) {
      return NextResponse.json(
        {
          code: "INVALID_TRANSITION",
          message: `A contract in '${contract.status}' status cannot be issued.`,
        },
        { status: 409 }
      );
    }

    const reissue = contract.status === "change_requested";
    const version = reissue ? contract.version + 1 : contract.version;

    await contractsCol.updateOne(
      { id: contractId },
      {
        $set: { status: "issued", issuedAt: FIXTURE_CLOCK, version },
        $push: {
          history: {
            at: FIXTURE_CLOCK,
            actor: guard.user.name,
            action: "issued",
            note: reissue
              ? `Reissued as version ${version} after client change request.`
              : "Contract issued to client for review.",
          },
        },
      }
    );

    const campaignsCol = await collections.campaigns();
    const existingCampaign = await campaignsCol.findOne({ contractId });

    if (existingCampaign) {
      await campaignsCol.updateOne(
        { contractId },
        {
          $set: {
            status: "awaiting_contract_acceptance",
            currentStage: "contract_issued",
          },
        }
      );
    } else {
      const orgsCol = await collections.organisations();
      const org = await orgsCol.findOne({ id: contract.organisationId });
      const campaignId = newCampaignId();

      await campaignsCol.insertOne({
        _id: campaignId,
        id: campaignId,
        organisationId: contract.organisationId,
        contractId,
        bookingId: null,
        name: `${org?.name ?? "Client"} campaign`,
        status: "awaiting_contract_acceptance",
        currentStage: "contract_issued",
        clientVisible: true,
      });
    }

    const serviceEventsCol = await collections.serviceEvents();
    const eventId = newServiceEventId();
    await serviceEventsCol.insertOne({
      _id: eventId,
      id: eventId,
      organisationId: contract.organisationId,
      contractId,
      campaignId: existingCampaign?.id ?? null,
      workOrderId: null,
      at: FIXTURE_CLOCK,
      type: "contract_issued",
      title: "Contract ready for review",
      clientVisible: true,
      clientSummary: reissue
        ? `A revised contract (version ${version}) is ready for your review.`
        : "Your contract is ready to review.",
    });

    const updated = await contractsCol.findOne({ id: contractId });
    const { _id, ...payload } = updated!;

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "ISSUE_FAILED",
        message: error.message || "Failed to issue contract",
      },
      { status: 500 }
    );
  }
};
