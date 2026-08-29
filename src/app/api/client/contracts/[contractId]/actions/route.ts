import { NextRequest, NextResponse } from "next/server";
import { requireClientOrganisation } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { ClientContractActionSchema } from "@/lib/schemas";
import { canTransitionContract } from "@/lib/domain/contracts/stateMachine";
import { checkAvailability, loadInventory } from "@/lib/domain/availability/recheck";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newBookingId, newCampaignId, newClientRequestId, newServiceEventId } from "@/lib/ids";

const conflict = (message: string) =>
  NextResponse.json({ code: "CONFLICT", message }, { status: 409 });

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) => {
  try {
    const guard = await requireClientOrganisation(req);
    if (!guard.ok) return guard.response;

    const { user, organisation } = guard;
    const { contractId } = await params;

    const contractsCol = await collections.contracts();
    const contract = await contractsCol.findOne({ id: contractId });

    if (!contract) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Contract '${contractId}' not found` },
        { status: 404 }
      );
    }

    if (contract.organisationId !== organisation.id) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "You cannot access this organisation's record.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = ClientContractActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid action payload",
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const { action, note } = parsed.data;

    const campaignsCol = await collections.campaigns();
    const serviceEventsCol = await collections.serviceEvents();
    const clientRequestsCol = await collections.clientRequests();

    if (action === "accept") {
      if (!canTransitionContract(contract.status, "accepted")) {
        return conflict(
          `A contract in '${contract.status}' status cannot be accepted.`
        );
      }

      const inventory = await loadInventory();

      for (const item of contract.items) {
        const check = checkAvailability({
          inventory,
          productId: item.productId,
          startDate: contract.startDate,
          endDate: contract.endDate,
          selectedAssetId: item.assetId ?? null,
          requiredUnits: item.quantity ?? 1,
        });

        if (!check.allocatable) {
          return NextResponse.json(
            {
              code: "INVENTORY_CONFLICT",
              message: `This contract can no longer be activated: ${check.conflictReason}`,
              details: { contractItemId: item.id, productId: item.productId },
            },
            { status: 409 }
          );
        }
      }

      const bookingsCol = await collections.bookings();
      const bookingIds: string[] = [];

      for (const item of contract.items) {
        const bookingId = newBookingId();
        bookingIds.push(bookingId);

        await bookingsCol.insertOne({
          _id: bookingId,
          id: bookingId,
          campaignName: `${organisation.name} campaign`,
          productId: item.productId,
          ...(item.assetId ? { assetId: item.assetId } : {}),
          ...(item.capacityPoolId
            ? {
                capacityPoolId: item.capacityPoolId,
                capacityUnits: item.quantity ?? 1,
              }
            : {}),
          startDate: contract.startDate,
          endDate: contract.endDate,
          status: "confirmed",
        });
      }

      await contractsCol.updateOne(
        { id: contractId },
        {
          $set: {
            status: "active",
            acceptedAt: FIXTURE_CLOCK,
            activatedAt: FIXTURE_CLOCK,
          },
          $push: {
            history: {
              $each: [
                {
                  at: FIXTURE_CLOCK,
                  actor: user.name,
                  action: "accepted",
                  note: note || "Accepted via client portal prototype.",
                },
                {
                  at: FIXTURE_CLOCK,
                  actor: "system",
                  action: "activated",
                  note: "Inventory rechecked and bookings confirmed on acceptance.",
                },
              ],
            },
          },
        }
      );

      const existingCampaign = await campaignsCol.findOne({ contractId });
      let campaignId = existingCampaign?.id ?? null;

      if (existingCampaign) {
        await campaignsCol.updateOne(
          { contractId },
          {
            $set: {
              status: "active",
              currentStage: "awaiting_installation",
              bookingId: bookingIds[0] ?? null,
            },
          }
        );
      } else {
        campaignId = newCampaignId();
        await campaignsCol.insertOne({
          _id: campaignId,
          id: campaignId,
          organisationId: organisation.id,
          contractId,
          bookingId: bookingIds[0] ?? null,
          name: `${organisation.name} campaign`,
          status: "active",
          currentStage: "awaiting_installation",
          clientVisible: true,
        });
      }

      const eventId = newServiceEventId();
      await serviceEventsCol.insertOne({
        _id: eventId,
        id: eventId,
        organisationId: organisation.id,
        contractId,
        campaignId,
        workOrderId: null,
        at: FIXTURE_CLOCK,
        type: "contract_accepted",
        title: "Contract accepted",
        clientVisible: true,
        clientSummary:
          "Your contract is accepted and the campaign is now active. Installation will be scheduled shortly.",
      });

      const orgsCol = await collections.organisations();
      await orgsCol.updateOne(
        { id: organisation.id },
        { $inc: { contractCount: 1 } }
      );
    } else if (action === "request_changes") {
      if (!canTransitionContract(contract.status, "change_requested")) {
        return conflict(
          `Changes cannot be requested on a contract in '${contract.status}' status.`
        );
      }

      if (!note?.trim()) {
        return NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Describe the change you need so management can review it.",
          },
          { status: 422 }
        );
      }

      await contractsCol.updateOne(
        { id: contractId },
        {
          $set: { status: "change_requested" },
          $push: {
            history: {
              at: FIXTURE_CLOCK,
              actor: user.name,
              action: "change_requested",
              note,
            },
          },
        }
      );

      const requestId = newClientRequestId();
      await clientRequestsCol.insertOne({
        _id: requestId,
        id: requestId,
        organisationId: organisation.id,
        contractId,
        type: "contract_change",
        status: "submitted",
        createdAt: FIXTURE_CLOCK,
        summary: note,
        history: [
          { at: FIXTURE_CLOCK, actor: user.name, action: "submitted", note },
        ],
      });
    } else if (action === "request_cancellation") {
      if (!note?.trim()) {
        return NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Give a reason so management can review the cancellation.",
          },
          { status: 422 }
        );
      }

      const requestId = newClientRequestId();
      await clientRequestsCol.insertOne({
        _id: requestId,
        id: requestId,
        organisationId: organisation.id,
        contractId,
        type: "cancellation",
        status: "submitted",
        createdAt: FIXTURE_CLOCK,
        summary: note,
        history: [
          { at: FIXTURE_CLOCK, actor: user.name, action: "submitted", note },
        ],
      });

      await contractsCol.updateOne(
        { id: contractId },
        {
          $push: {
            history: {
              at: FIXTURE_CLOCK,
              actor: user.name,
              action: "cancellation_requested",
              note,
            },
          },
        }
      );
    }

    const updated = await contractsCol.findOne({ id: contractId });
    const { _id, ...contractData } = updated!;

    const campaign = await campaignsCol.findOne({ contractId });
    const serviceEvents = await serviceEventsCol
      .find({ contractId, clientVisible: true })
      .sort({ at: 1 })
      .toArray();
    const clientRequests = await clientRequestsCol.find({ contractId }).toArray();

    return NextResponse.json({
      ...contractData,
      campaign: campaign ? (({ _id: cid, ...c }) => c)(campaign) : null,
      serviceEvents: serviceEvents.map(({ _id: sid, ...se }) => se),
      clientRequests: clientRequests.map(({ _id: rid, ...cr }) => cr),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "ACTION_FAILED",
        message: error.message || "Failed to execute contract action",
      },
      { status: 500 }
    );
  }
};
