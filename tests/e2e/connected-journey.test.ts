import { beforeAll, describe, expect, it } from "vitest";
import { GET as searchProducts } from "@/app/api/products/route";
import { POST as submitBookingRequest } from "@/app/api/booking-requests/route";
import { GET as managementDashboard } from "@/app/api/management/dashboard/route";
import { PATCH as decideRequest } from "@/app/api/management/booking-requests/[requestId]/route";
import { POST as createContract } from "@/app/api/management/contracts/route";
import { POST as issueContract } from "@/app/api/management/contracts/[contractId]/issue/route";
import { GET as clientSummary } from "@/app/api/client/summary/route";
import { GET as getClientContract } from "@/app/api/client/contracts/[contractId]/route";
import { POST as contractAction } from "@/app/api/client/contracts/[contractId]/actions/route";
import { POST as createWorkOrder } from "@/app/api/management/work-orders/route";
import { GET as listFieldJobs } from "@/app/api/mobile/work-orders/route";
import { POST as updateStatus } from "@/app/api/mobile/work-orders/[workOrderId]/status/route";
import { POST as uploadProof } from "@/app/api/mobile/work-orders/[workOrderId]/proof/route";
import {
  makeProofForm,
  makeRequest,
  readJson,
  reseed,
  USERS,
} from "../helpers/harness";

const START = "2027-06-01";
const END = "2027-09-01";

const journey: {
  requestId?: string;
  contractId?: string;
  campaignId?: string;
  workOrderId?: string;
} = {};

beforeAll(async () => {
  await reseed();
});

describe("Required check 10: one connected journey across all three surfaces", () => {
  it("client discovers an available product in the catalogue", async () => {
    const result = await readJson(
      await searchProducts(
        makeRequest(`/products?startDate=${START}&endDate=${END}`, {
          as: USERS.silverline,
        })
      )
    );

    expect(result.status).toBe(200);

    const door = result.body.items.find((i: any) => i.id === "product-hub-door");
    expect(door.availability.state).not.toBe("unavailable");
  });

  it("client submits a non-binding booking request", async () => {
    const result = await readJson(
      await submitBookingRequest(
        makeRequest("/booking-requests", {
          method: "POST",
          as: USERS.silverline,
          idempotencyKey: "journey-request-key",
          body: {
            productId: "product-hub-door",
            startDate: START,
            endDate: END,
            budget: 4200,
            objective: "Launch the new studio",
          },
        })
      )
    );

    expect(result.status).toBe(201);
    expect(result.body.status).toBe("submitted");

    journey.requestId = result.body.id;
  });

  it("the request surfaces on the management attention dashboard", async () => {
    const result = await readJson(
      await managementDashboard(
        makeRequest("/management/dashboard", { as: USERS.manager })
      )
    );

    expect(result.status).toBe(200);
    expect(
      result.body.attentionItems.some((a: any) => a.entityId === journey.requestId)
    ).toBe(true);
  });

  it("management approves the request against a named asset", async () => {
    const result = await readJson(
      await decideRequest(
        makeRequest(`/management/booking-requests/${journey.requestId}`, {
          method: "PATCH",
          as: USERS.manager,
          body: { action: "approve", selectedAssetId: "asset-door-a" },
        }),
        { params: Promise.resolve({ requestId: journey.requestId! }) }
      )
    );

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("approved");
  });

  it("management drafts and issues a contract", async () => {
    const draft = await readJson(
      await createContract(
        makeRequest("/management/contracts", {
          method: "POST",
          as: USERS.manager,
          idempotencyKey: "journey-contract-key",
          body: {
            organisationId: "org-silverline",
            bookingRequestId: journey.requestId,
            startDate: START,
            endDate: END,
            total: 3600,
            items: [
              {
                id: "journey-item-1",
                productId: "product-hub-door",
                assetId: "asset-door-a",
                quantity: 1,
                unitRate: 1200,
                rateUnit: "month",
                lineTotal: 3600,
              },
            ],
          },
        })
      )
    );

    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe("draft");
    journey.contractId = draft.body.id;

    const issued = await readJson(
      await issueContract(
        makeRequest(`/management/contracts/${journey.contractId}/issue`, {
          method: "POST",
          as: USERS.manager,
        }),
        { params: Promise.resolve({ contractId: journey.contractId! }) }
      )
    );

    expect(issued.status).toBe(200);
    expect(issued.body.status).toBe("issued");
  });

  it("the client sees the issued contract as an action needing attention", async () => {
    const summary = await readJson(
      await clientSummary(makeRequest("/client/summary", { as: USERS.silverline }))
    );

    expect(
      summary.body.attentionItems.some((a: any) => a.contractId === journey.contractId)
    ).toBe(true);
  });

  it("the client accepts, which activates the contract and its campaign", async () => {
    const result = await readJson(
      await contractAction(
        makeRequest(`/client/contracts/${journey.contractId}/actions`, {
          method: "POST",
          as: USERS.silverline,
          body: { action: "accept" },
          idempotencyKey: "journey-contract-accept-key",
        }),
        { params: Promise.resolve({ contractId: journey.contractId! }) }
      )
    );

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("active");
    expect(result.body.campaign.status).toBe("active");

    journey.campaignId = result.body.campaign.id;
  });

  it("management raises a work order and assigns the fitter", async () => {
    const result = await readJson(
      await createWorkOrder(
        makeRequest("/management/work-orders", {
          method: "POST",
          as: USERS.manager,
          idempotencyKey: "journey-work-order-key",
          body: {
            campaignId: journey.campaignId,
            contractId: journey.contractId,
            type: "installation",
            assignedUserId: USERS.fitter,
            assetId: "asset-door-a",
            scheduledStart: "2027-06-01T08:00:00Z",
            scheduledEnd: "2027-06-01T11:00:00Z",
            locationLabel: "Central hub, door A",
            instructions: "Fit seven printed panels. Report to the duty manager.",
            internalNotes: "Client has queried invoicing separately.",
          },
        })
      )
    );

    expect(result.status).toBe(201);
    expect(result.body.status).toBe("assigned");

    journey.workOrderId = result.body.id;
  });

  it("the job appears in the fitter's list without internal notes", async () => {
    const result = await readJson(
      await listFieldJobs(makeRequest("/mobile/work-orders", { as: USERS.fitter }))
    );

    const job = result.body.items.find((i: any) => i.id === journey.workOrderId);

    expect(job).toBeDefined();
    expect(job.internalNotes).toBeUndefined();
  });

  it("the fitter works the job through to completion with proof", async () => {
    const params = {
      params: Promise.resolve({ workOrderId: journey.workOrderId! }),
    };

    const step = (status: string, note: string | null, key: string) =>
      updateStatus(
        makeRequest(`/mobile/work-orders/${journey.workOrderId}/status`, {
          method: "POST",
          as: USERS.fitter,
          idempotencyKey: key,
          body: { status, note },
        }),
        params
      );

    expect((await readJson(await step("travelling", null, "j-travel"))).status).toBe(
      200
    );
    expect((await readJson(await step("on_site", null, "j-onsite"))).status).toBe(200);

    const blocked = await readJson(await step("blocked", null, "j-blocked-bad"));
    expect(blocked.status).toBe(422);

    const proof = await readJson(
      await uploadProof(
        makeRequest(`/mobile/work-orders/${journey.workOrderId}/proof`, {
          method: "POST",
          as: USERS.fitter,
          idempotencyKey: "j-proof-upload",
          formData: makeProofForm("Seven panels fitted and photographed"),
        }),
        params
      )
    );

    expect(proof.status).toBe(201);

    const completed = await readJson(
      await step("completed", "Install finished on schedule", "j-complete")
    );

    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe("completed");
  });

  it("the client sees the completion and its proof, but no internal notes", async () => {
    const result = await readJson(
      await getClientContract(
        makeRequest(`/client/contracts/${journey.contractId}`, {
          as: USERS.silverline,
        }),
        { params: Promise.resolve({ contractId: journey.contractId! }) }
      )
    );

    expect(result.status).toBe(200);

    const types = result.body.serviceEvents.map((e: any) => e.type);
    expect(types).toContain("contract_issued");
    expect(types).toContain("contract_accepted");
    expect(types).toContain("installation_scheduled");
    expect(types).toContain("work_order_completed");

    expect(result.body.proofRecords).toHaveLength(1);
    expect(result.body.proofRecords[0].completionNote).toBe(
      "Seven panels fitted and photographed"
    );

    expect(result.body.serviceEvents.every((e: any) => e.clientVisible)).toBe(true);
    expect(JSON.stringify(result.body)).not.toContain("queried invoicing");
  });

  it("another organisation cannot see any of it", async () => {
    const result = await readJson(
      await getClientContract(
        makeRequest(`/client/contracts/${journey.contractId}`, {
          as: USERS.oakLegal,
        }),
        { params: Promise.resolve({ contractId: journey.contractId! }) }
      )
    );

    expect(result.status).toBe(403);
  });
});
