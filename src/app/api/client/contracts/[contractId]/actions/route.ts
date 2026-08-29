import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { ClientContractActionSchema } from "@/lib/schemas";
import { FIXTURE_CLOCK } from "@/lib/constants";

export async function POST(
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

    if (contract.organisationId !== auth.organisation.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "You cannot access this organisation's record." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = ClientContractActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid action payload", details: parseResult.error.flatten() },
        { status: 422 }
      );
    }

    const { action, note } = parseResult.data;

    if (action === "accept") {
      if (contract.status !== "issued") {
        return NextResponse.json(
          { code: "CONFLICT", message: `Contract cannot be accepted in '${contract.status}' status.` },
          { status: 409 }
        );
      }

      // Transition to accepted / active
      const updatedContract = {
        ...contract,
        status: "accepted" as const,
        acceptedAt: FIXTURE_CLOCK,
        history: [
          ...contract.history,
          {
            at: FIXTURE_CLOCK,
            actor: auth.user.name,
            action: "accepted",
            note: note || "Accepted via client portal prototype.",
          },
        ],
      };

      await contractsCol.updateOne({ id: contractId }, { $set: updatedContract });

      // Activate or create connected campaign
      const campaignsCol = await collections.campaigns();
      let campaignDoc = await campaignsCol.findOne({ contractId });

      if (campaignDoc) {
        await campaignsCol.updateOne(
          { contractId },
          {
            $set: {
              status: "active",
              currentStage: "contract_accepted",
            },
          }
        );
      } else {
        const campaignId = `campaign-${Date.now().toString().slice(-4)}`;
        await campaignsCol.insertOne({
          _id: campaignId,
          id: campaignId,
          organisationId: auth.organisation.id,
          contractId,
          bookingId: null,
          name: `${auth.organisation.name} Campaign`,
          status: "active",
          currentStage: "contract_accepted",
          clientVisible: true,
        });
      }

      // Create confirmed bookings for contract items if exclusive_asset
      const bookingsCol = await collections.bookings();
      for (const item of contract.items) {
        if (item.assetId) {
          const bookingId = `booking-${Date.now().toString().slice(-4)}-${item.id}`;
          await bookingsCol.insertOne({
            _id: bookingId,
            id: bookingId,
            campaignName: `${auth.organisation.name} Campaign`,
            productId: item.productId,
            assetId: item.assetId,
            startDate: contract.startDate,
            endDate: contract.endDate,
            status: "confirmed",
          });
        } else if (item.capacityPoolId) {
          const bookingId = `booking-${Date.now().toString().slice(-4)}-${item.id}`;
          await bookingsCol.insertOne({
            _id: bookingId,
            id: bookingId,
            campaignName: `${auth.organisation.name} Campaign`,
            productId: item.productId,
            capacityPoolId: item.capacityPoolId,
            capacityUnits: item.quantity,
            startDate: contract.startDate,
            endDate: contract.endDate,
            status: "confirmed",
          });
        }
      }

      // Emit client-visible service event
      const serviceEventsCol = await collections.serviceEvents();
      const eventId = `event-${Date.now().toString().slice(-6)}`;
      await serviceEventsCol.insertOne({
        _id: eventId,
        id: eventId,
        organisationId: auth.organisation.id,
        contractId,
        campaignId: campaignDoc?.id || null,
        workOrderId: null,
        at: FIXTURE_CLOCK,
        type: "contract_accepted",
        title: "Contract accepted",
        clientVisible: true,
        clientSummary: "Your advertising contract has been accepted and activated.",
      });

      // Increment org contractCount
      const orgsCol = await collections.organisations();
      await orgsCol.updateOne({ id: auth.organisation.id }, { $inc: { contractCount: 1 } });
    } else if (action === "request_changes") {
      if (contract.status !== "issued") {
        return NextResponse.json(
          { code: "CONFLICT", message: `Cannot request changes on contract in '${contract.status}' status.` },
          { status: 409 }
        );
      }

      await contractsCol.updateOne(
        { id: contractId },
        {
          $set: {
            status: "change_requested",
            history: [
              ...contract.history,
              {
                at: FIXTURE_CLOCK,
                actor: auth.user.name,
                action: "change_requested",
                note: note || "Client requested changes.",
              },
            ],
          },
        }
      );

      const clientRequestsCol = await collections.clientRequests();
      const reqId = `client-req-${Date.now().toString().slice(-4)}`;
      await clientRequestsCol.insertOne({
        _id: reqId,
        id: reqId,
        organisationId: auth.organisation.id,
        contractId,
        type: "contract_change",
        status: "submitted",
        createdAt: FIXTURE_CLOCK,
        summary: note || "Client requested changes to contract terms.",
        history: [{ at: FIXTURE_CLOCK, actor: auth.user.name, action: "submitted", note }],
      });
    } else if (action === "request_cancellation") {
      const clientRequestsCol = await collections.clientRequests();
      const reqId = `client-req-${Date.now().toString().slice(-4)}`;
      await clientRequestsCol.insertOne({
        _id: reqId,
        id: reqId,
        organisationId: auth.organisation.id,
        contractId,
        type: "cancellation",
        status: "submitted",
        createdAt: FIXTURE_CLOCK,
        summary: note || "Client requested contract cancellation.",
        history: [{ at: FIXTURE_CLOCK, actor: auth.user.name, action: "submitted", note }],
      });
    }

    // Return updated contract detail
    const updatedDoc = await contractsCol.findOne({ id: contractId });
    const { _id, ...updatedContractData } = updatedDoc!;

    const campaignsCol = await collections.campaigns();
    const campaignDoc = await campaignsCol.findOne({ contractId });

    const serviceEventsCol = await collections.serviceEvents();
    const serviceEvents = await serviceEventsCol.find({ contractId, clientVisible: true }).toArray();

    const clientRequestsCol = await collections.clientRequests();
    const clientRequests = await clientRequestsCol.find({ contractId }).toArray();

    return NextResponse.json({
      ...updatedContractData,
      campaign: campaignDoc ? (({ _id, ...c }) => c)(campaignDoc) : null,
      serviceEvents: serviceEvents.map(({ _id, ...se }) => se),
      proofRecords: [],
      clientRequests: clientRequests.map(({ _id, ...cr }) => cr),
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: "ACTION_FAILED", message: error.message || "Failed to execute contract action" },
      { status: 500 }
    );
  }
}
