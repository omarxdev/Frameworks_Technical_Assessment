import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { WorkOrderCreateSchema, WorkOrderStatusSchema } from "@/lib/schemas";
import {
  missingKeyResponse,
  readIdempotencyKey,
  validateIdempotencyKey,
  withIdempotency,
} from "@/lib/domain/idempotency";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { formatDay } from "@/lib/format";
import { newServiceEventId, newWorkOrderId } from "@/lib/ids";

export const GET = async (req: NextRequest) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const parsedStatus = WorkOrderStatusSchema.safeParse(searchParams.get("status"));
    const contractId = searchParams.get("contractId");

    const query: Record<string, unknown> = {};
    if (parsedStatus.success) query.status = parsedStatus.data;
    if (contractId) query.contractId = contractId;

    const workOrdersCol = await collections.workOrders();
    const docs = await workOrdersCol.find(query).sort({ scheduledStart: 1 }).toArray();

    const [assetsDocs, usersDocs, contractsDocs, campaignsDocs, proofDocs] =
      await Promise.all([
        (await collections.assets()).find({}).toArray(),
        (await collections.users()).find({}).toArray(),
        (await collections.contracts()).find({}).toArray(),
        (await collections.campaigns()).find({}).toArray(),
        (await collections.proofRecords()).find({}).toArray(),
      ]);

    const assetNames = new Map(assetsDocs.map((a) => [a.id, a.name]));
    const userNames = new Map(usersDocs.map((u) => [u.id, u.name]));

    const items = docs.map(({ _id, ...wo }) => ({
      ...wo,
      assetName: assetNames.get(wo.assetId) ?? wo.assetId,
      assignedUserName: userNames.get(wo.assignedUserId) ?? wo.assignedUserId,
      proofRecords: proofDocs
        .filter((p) => p.workOrderId === wo.id)
        .map(({ _id: proofId, ...p }) => p),
    }));

    return NextResponse.json({
      items,
      references: {
        assets: assetsDocs.map((a) => ({
          id: a.id,
          name: a.name,
          productId: a.productId,
          status: a.status,
        })),
        contracts: contractsDocs.map((c) => ({
          id: c.id,
          status: c.status,
          organisationId: c.organisationId,
          startDate: c.startDate,
          endDate: c.endDate,
        })),
        campaigns: campaignsDocs.map((c) => ({
          id: c.id,
          name: c.name,
          contractId: c.contractId,
          organisationId: c.organisationId,
          status: c.status,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "WORK_ORDERS_FETCH_FAILED",
        message: error.message || "Failed to list work orders",
      },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const guard = await requireRole(req, ["manager"]);
    if (!guard.ok) return guard.response;

    const actorName = guard.user.name;

    const key = readIdempotencyKey(req);
    if (!validateIdempotencyKey(key)) return missingKeyResponse();

    const body = await req.json();
    const parseResult = WorkOrderCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid work order creation payload",
          details: parseResult.error.flatten(),
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    const contractsCol = await collections.contracts();
    const contract = await contractsCol.findOne({ id: data.contractId });
    if (!contract) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Contract '${data.contractId}' not found` },
        { status: 404 }
      );
    }

    const idempotency = await withIdempotency({
      scope: "management-work-order-create",
      actorId: guard.user.id,
      key: key!,
      body: data,
    });
    if (idempotency.kind !== "proceed") return idempotency.response;

    const workOrderId = newWorkOrderId();
    const newWorkOrder = {
      id: workOrderId,
      campaignId: data.campaignId,
      contractId: data.contractId,
      organisationId: contract.organisationId,
      type: data.type,
      status: "assigned" as const,
      assignedUserId: data.assignedUserId,
      assetId: data.assetId,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      locationLabel: data.locationLabel,
      instructions: data.instructions,
      internalNotes: data.internalNotes || "",
      completionNote: null,
      proofRecordIds: [],
      history: [
        {
          at: FIXTURE_CLOCK,
          actor: actorName,
          action: "assigned",
          note: `Assigned to ${data.assignedUserId}.`,
        },
      ],
    };

    const workOrdersCol = await collections.workOrders();
    await workOrdersCol.insertOne({ _id: workOrderId, ...newWorkOrder });

    const serviceEventsCol = await collections.serviceEvents();
    const eventId = newServiceEventId();
    await serviceEventsCol.insertOne({
      _id: eventId,
      id: eventId,
      organisationId: contract.organisationId,
      contractId: data.contractId,
      campaignId: data.campaignId,
      workOrderId,
      at: FIXTURE_CLOCK,
      type: "installation_scheduled",
      title: "Installation scheduled",
      clientVisible: true,
      clientSummary: `Installation is planned for ${formatDay(data.scheduledStart)}.`,
    });

    await idempotency.commit(newWorkOrder, 201);
    return NextResponse.json(newWorkOrder, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "WORK_ORDER_CREATE_FAILED",
        message: error.message || "Failed to create work order",
      },
      { status: 500 }
    );
  }
};
