import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { ClientRequestDecisionSchema } from "@/lib/schemas";
import { canTransitionContract } from "@/lib/domain/contracts/state-machine";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newServiceEventId } from "@/lib/ids";
import type { ClientRequest, ClientRequestStatus } from "@/lib/schemas";

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ clientRequestId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const { clientRequestId } = await params;
    const clientRequestsCol = await collections.clientRequests();
    const clientRequest = await clientRequestsCol.findOne({
      id: clientRequestId,
    });

    if (!clientRequest) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: `Client request '${clientRequestId}' not found`,
        },
        { status: 404 }
      );
    }

    if (clientRequest.status !== "submitted") {
      return NextResponse.json(
        {
          code: "ALREADY_DECIDED",
          message: `This request was already ${clientRequest.status}.`,
        },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = ClientRequestDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid client request decision",
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const { action, note } = parsed.data;

    const contractsCol = await collections.contracts();
    const contract = await contractsCol.findOne({
      id: clientRequest.contractId,
    });

    if (!contract) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: `Contract '${clientRequest.contractId}' not found`,
        },
        { status: 404 }
      );
    }

    const decisionStatus: ClientRequestStatus =
      action === "approve" ? "approved" : "declined";

    const historyEntry = {
      at: FIXTURE_CLOCK,
      actor: guard.user.name,
      action: decisionStatus,
      note: note?.trim() || null,
    };

    let contractStatusAfter = contract.status;
    let clientSummary: string | null = null;

    if (clientRequest.type === "cancellation" && action === "approve") {
      if (!canTransitionContract(contract.status, "cancelled")) {
        return NextResponse.json(
          {
            code: "INVALID_TRANSITION",
            message: `A contract in '${contract.status}' status cannot be cancelled.`,
          },
          { status: 409 }
        );
      }

      await releaseBookingsFor(contract.id);

      await contractsCol.updateOne(
        { id: contract.id },
        {
          $set: { status: "cancelled" },
          $push: {
            history: {
              at: FIXTURE_CLOCK,
              actor: guard.user.name,
              action: "cancelled",
              note:
                note?.trim() ||
                "Cancellation approved by management. Inventory released.",
            },
          },
        }
      );

      const campaignsCol = await collections.campaigns();
      await campaignsCol.updateOne(
        { contractId: contract.id },
        { $set: { status: "cancelled", currentStage: "cancelled" } }
      );

      contractStatusAfter = "cancelled";
      clientSummary =
        "Your cancellation request has been approved and the campaign is now closed.";
    }

    if (clientRequest.type === "cancellation" && action === "decline") {
      await contractsCol.updateOne(
        { id: contract.id },
        {
          $push: {
            history: {
              at: FIXTURE_CLOCK,
              actor: guard.user.name,
              action: "cancellation_declined",
              note: note?.trim() || "Cancellation request declined.",
            },
          },
        }
      );

      clientSummary =
        "Your cancellation request was reviewed and declined. The contract remains in place.";
    }

    if (clientRequest.type === "contract_change" && action === "decline") {
      if (contract.status === "change_requested") {
        await contractsCol.updateOne(
          { id: contract.id },
          {
            $set: { status: "issued" },
            $push: {
              history: {
                at: FIXTURE_CLOCK,
                actor: guard.user.name,
                action: "issued",
                note:
                  note?.trim() ||
                  `Change request declined. Version ${contract.version} stands as issued.`,
              },
            },
          }
        );
        contractStatusAfter = "issued";
      }

      clientSummary = `Your requested change was declined. Version ${contract.version} of the contract still stands for your review.`;
    }

    if (clientRequest.type === "contract_change" && action === "approve") {
      await contractsCol.updateOne(
        { id: contract.id },
        {
          $push: {
            history: {
              at: FIXTURE_CLOCK,
              actor: guard.user.name,
              action: "change_accepted",
              note:
                note?.trim() || "Change accepted. A revised contract will be reissued.",
            },
          },
        }
      );

      clientSummary =
        "Your requested change was accepted. A revised contract will follow shortly.";
    }

    await clientRequestsCol.updateOne(
      { id: clientRequestId },
      {
        $set: { status: decisionStatus, resolvedAt: FIXTURE_CLOCK },
        $push: { history: historyEntry },
      }
    );

    if (clientSummary) {
      const serviceEventsCol = await collections.serviceEvents();
      const eventId = newServiceEventId();
      await serviceEventsCol.insertOne({
        _id: eventId,
        id: eventId,
        organisationId: contract.organisationId,
        contractId: contract.id,
        campaignId: null,
        workOrderId: null,
        at: FIXTURE_CLOCK,
        type: `client_request_${decisionStatus}`,
        title:
          clientRequest.type === "cancellation"
            ? "Cancellation request reviewed"
            : "Change request reviewed",
        clientVisible: true,
        clientSummary,
      });
    }

    const updated = await clientRequestsCol.findOne({ id: clientRequestId });
    const { _id, ...clientRequestData } = updated as ClientRequest & {
      _id: string;
    };

    return NextResponse.json(
      { ...clientRequestData, contractStatus: contractStatusAfter },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "CLIENT_REQUEST_DECISION_FAILED",
        message: error.message || "Failed to record the decision",
      },
      { status: 500 }
    );
  }
};

const releaseBookingsFor = async (contractId: string) => {
  const contractsCol = await collections.contracts();
  const contract = await contractsCol.findOne({ id: contractId });

  const campaignsCol = await collections.campaigns();
  const campaign = await campaignsCol.findOne({ contractId });

  const bookingIds = contract?.bookingIds?.length
    ? contract.bookingIds
    : campaign?.bookingId
      ? [campaign.bookingId]
      : [];

  if (bookingIds.length === 0) return;

  const bookingsCol = await collections.bookings();
  await bookingsCol.updateMany(
    { id: { $in: bookingIds } },
    { $set: { status: "cancelled" } }
  );
};
