import { NextRequest, NextResponse } from "next/server";
import { forbidden, requireRole } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import {
  missingKeyResponse,
  readIdempotencyKey,
  validateIdempotencyKey,
  withIdempotency,
} from "@/lib/api/idempotency";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { newProofRecordId, newServiceEventId } from "@/lib/db/ids";
import { notFound, validationError } from "@/lib/api/responses";

const MAX_PROOF_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ workOrderId: string }> }
) => {
  try {
    const guard = await requireRole(req, ["fitter", "manager"]);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!validateIdempotencyKey(key)) return missingKeyResponse();

    const { workOrderId } = await params;
    const workOrdersCol = await collections.workOrders();
    const workOrder = await workOrdersCol.findOne({ id: workOrderId });

    if (!workOrder) {
      return notFound(`Work order '${workOrderId}' not found`);
    }

    if (guard.user.role === "fitter" && workOrder.assignedUserId !== guard.user.id) {
      return forbidden("This work order is assigned to another engineer.");
    }

    if (req.headers.get("x-simulate-upload-failure") === "true") {
      return NextResponse.json(
        {
          code: "PROOF_STORAGE_UNAVAILABLE",
          message:
            "Proof storage is temporarily unavailable. The upload has been queued; retry when you have signal.",
        },
        { status: 503 }
      );
    }

    const form = await req.formData().catch(() => null);
    if (!form) {
      return validationError("Expected multipart/form-data with 'file' and 'completionNote'.");
    }

    const completionNote = String(form.get("completionNote") ?? "").trim();
    if (completionNote.length < 3) {
      return validationError("A completion note of at least 3 characters is required.");
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return validationError("At least one proof attachment is required.");
    }

    if (file.size > MAX_PROOF_BYTES) {
      return validationError(
        `Proof attachments are capped at ${MAX_PROOF_BYTES / 1024 / 1024}MB in this prototype.`
      );
    }

    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.includes(contentType)) {
      return validationError(
        `Unsupported proof type '${contentType}'. Allowed: ${ALLOWED_TYPES.join(", ")}.`
      );
    }

    const idempotency = await withIdempotency({
      scope: `work-order-proof:${workOrderId}`,
      actorId: guard.user.id,
      key: key!,
      body: { completionNote, fileName: file.name, size: file.size },
    });
    if (idempotency.kind !== "proceed") return idempotency.response;

    const bytes = Buffer.from(await file.arrayBuffer());
    const previewUrl = `data:${contentType};base64,${bytes.toString("base64")}`;

    const proofId = newProofRecordId();
    const proofRecord = {
      id: proofId,
      workOrderId,
      fileName: file.name,
      previewUrl,
      completionNote,
      createdAt: FIXTURE_CLOCK,
      createdByUserId: guard.user.id,
    };

    const proofCol = await collections.proofRecords();
    await proofCol.insertOne({ _id: proofId, ...proofRecord });

    await workOrdersCol.updateOne(
      { id: workOrderId },
      {
        $set: { completionNote },
        $push: {
          proofRecordIds: proofId,
          history: {
            at: FIXTURE_CLOCK,
            actor: guard.user.name,
            action: "proof_attached",
            note: completionNote,
          },
        },
      }
    );

    const assetsCol = await collections.assets();
    const asset = await assetsCol.findOne({ id: workOrder.assetId });
    const assetName = asset?.name || workOrder.locationLabel;

    const serviceEventsCol = await collections.serviceEvents();
    const eventId = newServiceEventId();
    await serviceEventsCol.insertOne({
      _id: eventId,
      id: eventId,
      organisationId: workOrder.organisationId,
      contractId: workOrder.contractId,
      campaignId: workOrder.campaignId,
      workOrderId,
      at: FIXTURE_CLOCK,
      type: "proof_attached",
      title: "Completion proof captured",
      clientVisible: true,
      clientSummary: `Photographic proof of work at ${assetName} has been recorded.`,
    });

    const { previewUrl: _preview, ...responseRecord } = proofRecord;
    await idempotency.commit(responseRecord, 201);

    return NextResponse.json(responseRecord, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "PROOF_UPLOAD_FAILED",
        message: error.message || "Failed to attach proof",
      },
      { status: 500 }
    );
  }
};
