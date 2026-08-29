import { beforeEach, describe, expect, it } from "vitest";
import { GET as getWorkOrderDetail } from "@/app/api/mobile/work-orders/[workOrderId]/route";
import { GET as listWorkOrders } from "@/app/api/mobile/work-orders/route";
import { POST as updateStatus } from "@/app/api/mobile/work-orders/[workOrderId]/status/route";
import { POST as uploadProof } from "@/app/api/mobile/work-orders/[workOrderId]/proof/route";
import {
  getWorkOrder,
  makeProofForm,
  makeRequest,
  proofsFor,
  readJson,
  reseed,
  serviceEventsFor,
  USERS,
} from "../helpers/harness";

const woParams = (workOrderId: string) => ({
  params: Promise.resolve({ workOrderId }),
});

const WO = "work-order-001";

const advanceTo = async (status: string, note: string | null, key: string) =>
  readJson(
    await updateStatus(
      makeRequest(`/mobile/work-orders/${WO}/status`, {
        method: "POST",
        as: USERS.fitter,
        idempotencyKey: key,
        body: { status, note },
      }),
      woParams(WO)
    )
  );

beforeEach(async () => {
  await reseed();
});

describe("Required check 7: a blocked work order requires a reason", () => {
  it("rejects a blocked transition with no reason", async () => {
    const result = await advanceTo("blocked", null, "blocked-no-reason-key");

    expect(result.status).toBe(422);
    expect(result.body.code).toBe("REASON_REQUIRED");

    const workOrder = await getWorkOrder(WO);
    expect(workOrder?.status).toBe("assigned");
  });

  it("rejects a blocked transition with a whitespace-only reason", async () => {
    const result = await advanceTo("blocked", "   ", "blocked-blank-reason-key");
    expect(result.status).toBe(422);
  });

  it("accepts a blocked transition with a reason and records it in history", async () => {
    const result = await advanceTo(
      "blocked",
      "Depot gate locked, waiting on site security",
      "blocked-with-reason-key"
    );

    expect(result.status).toBe(200);

    const workOrder = await getWorkOrder(WO);
    expect(workOrder?.status).toBe("blocked");

    const entry = workOrder!.history.find((h: any) => h.action === "blocked");
    expect(entry?.note).toContain("Depot gate locked");
    expect(entry?.actor).toBe("Casey Morgan");
  });
});

describe("Required check 8: completion requires proof and updates service history", () => {
  it("refuses completion before any proof exists", async () => {
    await advanceTo("travelling", null, "flow-travelling-1");
    await advanceTo("on_site", null, "flow-onsite-1");

    const result = await advanceTo(
      "completed",
      "All panels fitted",
      "flow-complete-noproof"
    );

    expect(result.status).toBe(422);
    expect(result.body.code).toBe("PROOF_REQUIRED");

    const workOrder = await getWorkOrder(WO);
    expect(workOrder?.status).toBe("on_site");
  });

  it("accepts completion once proof is attached and writes a client-visible event", async () => {
    await advanceTo("travelling", null, "flow-travelling-2");
    await advanceTo("on_site", null, "flow-onsite-2");

    const proof = await readJson(
      await uploadProof(
        makeRequest(`/mobile/work-orders/${WO}/proof`, {
          method: "POST",
          as: USERS.fitter,
          idempotencyKey: "flow-proof-upload-2",
          formData: makeProofForm("Panels fitted and photographed"),
        }),
        woParams(WO)
      )
    );

    expect(proof.status).toBe(201);
    expect(await proofsFor(WO)).toHaveLength(1);

    const completed = await advanceTo(
      "completed",
      "All panels fitted",
      "flow-complete-withproof"
    );

    expect(completed.status).toBe(200);

    const workOrder = await getWorkOrder(WO);
    expect(workOrder?.status).toBe("completed");
    expect(workOrder?.completionNote).toBe("Panels fitted and photographed");
    expect(workOrder?.proofRecordIds).toHaveLength(1);

    const events = await serviceEventsFor("contract-002");
    const completionEvent = events.find((e) => e.type === "work_order_completed");
    expect(completionEvent?.clientVisible).toBe(true);
    expect(completionEvent?.clientSummary).toBeTruthy();
  });

  it("requires a completion note on the proof upload", async () => {
    const result = await readJson(
      await uploadProof(
        makeRequest(`/mobile/work-orders/${WO}/proof`, {
          method: "POST",
          as: USERS.fitter,
          idempotencyKey: "proof-short-note",
          formData: makeProofForm("no"),
        }),
        woParams(WO)
      )
    );

    expect(result.status).toBe(422);
  });

  it("rejects an unsupported proof file type", async () => {
    const result = await readJson(
      await uploadProof(
        makeRequest(`/mobile/work-orders/${WO}/proof`, {
          method: "POST",
          as: USERS.fitter,
          idempotencyKey: "proof-bad-type",
          formData: makeProofForm("Valid note here", "notes.txt", "text/plain"),
        }),
        woParams(WO)
      )
    );

    expect(result.status).toBe(422);
  });

  it("does not double-create proof when the same upload is retried", async () => {
    const send = () =>
      uploadProof(
        makeRequest(`/mobile/work-orders/${WO}/proof`, {
          method: "POST",
          as: USERS.fitter,
          idempotencyKey: "retried-upload-key",
          formData: makeProofForm("Retried after weak signal"),
        }),
        woParams(WO)
      );

    await send();
    await send();

    expect(await proofsFor(WO)).toHaveLength(1);
  });

  it("simulates a storage outage so the field app can exercise retry", async () => {
    const result = await readJson(
      await uploadProof(
        makeRequest(`/mobile/work-orders/${WO}/proof`, {
          method: "POST",
          as: USERS.fitter,
          idempotencyKey: "simulated-outage-key",
          headers: { "x-simulate-upload-failure": "true" },
          formData: makeProofForm("Attempted during poor signal"),
        }),
        woParams(WO)
      )
    );

    expect(result.status).toBe(503);
    expect(result.body.code).toBe("PROOF_STORAGE_UNAVAILABLE");
  });
});

describe("Work-order transitions and scoping", () => {
  it("rejects an illegal transition", async () => {
    const result = await advanceTo("completed", "Skipping ahead", "illegal-jump");
    expect(result.status).toBe(409);
    expect(result.body.code).toBe("INVALID_TRANSITION");
  });

  it("scopes the fitter list to their own jobs", async () => {
    const result = await readJson(
      await listWorkOrders(makeRequest("/mobile/work-orders", { as: USERS.fitter }))
    );

    expect(result.status).toBe(200);
    expect(
      result.body.items.every((i: any) => i.assignedUserId === USERS.fitter)
    ).toBe(true);
  });

  it("hides internal notes from the mobile payload", async () => {
    const result = await readJson(
      await getWorkOrderDetail(
        makeRequest(`/mobile/work-orders/${WO}`, { as: USERS.fitter }),
        woParams(WO)
      )
    );

    expect(result.status).toBe(200);
    expect(result.body.internalNotes).toBeUndefined();
  });

  it("refuses a client session on the field routes", async () => {
    const result = await readJson(
      await listWorkOrders(
        makeRequest("/mobile/work-orders", { as: USERS.oakLegal })
      )
    );

    expect(result.status).toBe(403);
  });
});
