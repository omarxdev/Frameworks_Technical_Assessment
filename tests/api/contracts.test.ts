import { beforeEach, describe, expect, it } from "vitest";
import { GET as getClientContract } from "@/app/api/client/contracts/[contractId]/route";
import { POST as contractAction } from "@/app/api/client/contracts/[contractId]/actions/route";
import { POST as issueContract } from "@/app/api/management/contracts/[contractId]/issue/route";
import { POST as completeContract } from "@/app/api/management/contracts/[contractId]/complete/route";
import { POST as decideClientRequest } from "@/app/api/management/client-requests/[clientRequestId]/route";
import { PATCH as decideRequest } from "@/app/api/management/booking-requests/[requestId]/route";
import {
  bookingsByIds,
  clientRequestsFor,
  getCampaign,
  getContract,
  insertServiceEvent,
  makeRequest,
  readJson,
  reseed,
  serviceEventsFor,
  USERS,
} from "../helpers/harness";

let idempotencyCounter = 0;
const nextIdempotencyKey = () => `test-idem-key-${++idempotencyCounter}`;

const contractParams = (contractId: string) => ({
  params: Promise.resolve({ contractId }),
});

const requestParams = (requestId: string) => ({
  params: Promise.resolve({ requestId }),
});

const clientRequestParams = (clientRequestId: string) => ({
  params: Promise.resolve({ clientRequestId }),
});

const acceptContract = (contractId: string, as: string) =>
  contractAction(
    makeRequest(`/client/contracts/${contractId}/actions`, {
      method: "POST",
      as,
      body: { action: "accept" },
      idempotencyKey: nextIdempotencyKey(),
    }),
    contractParams(contractId)
  );

const raiseCancellation = async (contractId: string, as: string) => {
  await contractAction(
    makeRequest(`/client/contracts/${contractId}/actions`, {
      method: "POST",
      as,
      body: { action: "request_cancellation", note: "Budget was reallocated." },
      idempotencyKey: nextIdempotencyKey(),
    }),
    contractParams(contractId)
  );

  const open = await clientRequestsFor(contractId);
  return open.find((r) => r.type === "cancellation")!;
};

beforeEach(async () => {
  await reseed();
});

describe("Required check 9: cross-organisation isolation", () => {
  it("refuses to serve organisation B's contract to organisation A", async () => {
    const result = await readJson(
      await getClientContract(
        makeRequest("/client/contracts/contract-001", { as: USERS.silverline }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(403);
    expect(result.body.code).toBe("FORBIDDEN");
  });

  it("serves the same contract to its owning organisation", async () => {
    const result = await readJson(
      await getClientContract(
        makeRequest("/client/contracts/contract-001", { as: USERS.lighthouse }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(200);
    expect(result.body.organisationId).toBe("org-lighthouse");
  });

  it("refuses a cross-organisation contract action", async () => {
    const result = await readJson(
      await contractAction(
        makeRequest("/client/contracts/contract-001/actions", {
          method: "POST",
          as: USERS.oakLegal,
          body: { action: "accept" },
          idempotencyKey: nextIdempotencyKey(),
        }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(403);
  });

  it("refuses a manager session on a client-scoped contract route", async () => {
    const result = await readJson(
      await getClientContract(
        makeRequest("/client/contracts/contract-001", { as: USERS.manager }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(403);
  });
});

describe("Required check 6: contract issue, acceptance and change request", () => {
  it("lets the owning client accept an issued contract, which activates it", async () => {
    const before = await getContract("contract-001");
    expect(before?.status).toBe("issued");

    const result = await readJson(
      await contractAction(
        makeRequest("/client/contracts/contract-001/actions", {
          method: "POST",
          as: USERS.lighthouse,
          body: { action: "accept" },
          idempotencyKey: nextIdempotencyKey(),
        }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(200);

    const after = await getContract("contract-001");
    expect(after?.status).toBe("active");
    expect(after?.acceptedAt).not.toBeNull();
    expect(after?.activatedAt).not.toBeNull();

    const actions = after!.history.map((h: any) => h.action);
    expect(actions).toContain("accepted");
    expect(actions).toContain("activated");

    const events = await serviceEventsFor("contract-001");
    expect(events.some((e) => e.type === "contract_accepted")).toBe(true);
  });

  it("records a change request without rewriting the issued contract", async () => {
    const before = await getContract("contract-001");

    const result = await readJson(
      await contractAction(
        makeRequest("/client/contracts/contract-001/actions", {
          method: "POST",
          as: USERS.lighthouse,
          body: {
            action: "request_changes",
            note: "Please move the start date to March.",
          },
          idempotencyKey: nextIdempotencyKey(),
        }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(200);

    const after = await getContract("contract-001");
    expect(after?.status).toBe("change_requested");
    expect(after?.version).toBe(before?.version);
    expect(after?.total).toBe(before?.total);
    expect(after?.startDate).toBe(before?.startDate);
    expect(result.body.clientRequests.some((r: any) => r.status === "submitted")).toBe(
      true
    );
  });

  it("requires a note when requesting changes", async () => {
    const result = await readJson(
      await contractAction(
        makeRequest("/client/contracts/contract-001/actions", {
          method: "POST",
          as: USERS.lighthouse,
          body: { action: "request_changes" },
          idempotencyKey: nextIdempotencyKey(),
        }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(422);
  });

  it("bumps the version when management reissues after a change request", async () => {
    await contractAction(
      makeRequest("/client/contracts/contract-001/actions", {
        method: "POST",
        as: USERS.lighthouse,
        body: { action: "request_changes", note: "Shift the dates." },
        idempotencyKey: nextIdempotencyKey(),
      }),
      contractParams("contract-001")
    );

    const result = await readJson(
      await issueContract(
        makeRequest("/management/contracts/contract-001/issue", {
          method: "POST",
          as: USERS.manager,
        }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("issued");
    expect(result.body.version).toBe(2);
  });

  it("refuses to accept a contract twice", async () => {
    await contractAction(
      makeRequest("/client/contracts/contract-001/actions", {
        method: "POST",
        as: USERS.lighthouse,
        body: { action: "accept" },
        idempotencyKey: nextIdempotencyKey(),
      }),
      contractParams("contract-001")
    );

    const second = await readJson(
      await contractAction(
        makeRequest("/client/contracts/contract-001/actions", {
          method: "POST",
          as: USERS.lighthouse,
          body: { action: "accept" },
          idempotencyKey: nextIdempotencyKey(),
        }),
        contractParams("contract-001")
      )
    );

    expect(second.status).toBe(409);
  });

  it("keeps a cancellation request pending rather than cancelling the contract", async () => {
    const result = await readJson(
      await contractAction(
        makeRequest("/client/contracts/contract-002/actions", {
          method: "POST",
          as: USERS.oakLegal,
          body: {
            action: "request_cancellation",
            note: "Budget was reallocated.",
          },
          idempotencyKey: nextIdempotencyKey(),
        }),
        contractParams("contract-002")
      )
    );

    expect(result.status).toBe(200);

    const after = await getContract("contract-002");
    expect(after?.status).toBe("active");
    expect(
      result.body.clientRequests.some(
        (r: any) => r.type === "cancellation" && r.status === "submitted"
      )
    ).toBe(true);
  });
});

describe("Approval rechecks availability", () => {
  it("refuses to approve the request whose assets are all blocked", async () => {
    const result = await readJson(
      await decideRequest(
        makeRequest("/management/booking-requests/request-001", {
          method: "PATCH",
          as: USERS.manager,
          body: { action: "approve" },
        }),
        requestParams("request-001")
      )
    );

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("INVENTORY_CONFLICT");
    expect(result.body.details.blockers.length).toBe(3);
  });

  it("refuses a client session on the management decision route", async () => {
    const result = await readJson(
      await decideRequest(
        makeRequest("/management/booking-requests/request-001", {
          method: "PATCH",
          as: USERS.silverline,
          body: { action: "approve" },
        }),
        requestParams("request-001")
      )
    );

    expect(result.status).toBe(403);
  });
});

describe("Contract acceptance passes through the accepted state", () => {
  it("records accepted before activating, and stores the booking ids", async () => {
    const result = await readJson(
      await acceptContract("contract-001", USERS.lighthouse)
    );

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("active");
    expect(result.body.acceptedAt).toBeTruthy();
    expect(result.body.activatedAt).toBeTruthy();

    const stored = await getContract("contract-001");
    expect(stored?.bookingIds?.length).toBeGreaterThan(0);

    const actions = stored!.history.map((entry) => entry.action);
    expect(actions).toContain("accepted");
    expect(actions).toContain("activated");
    expect(actions.indexOf("accepted")).toBeLessThan(actions.indexOf("activated"));

    const bookings = await bookingsByIds(stored!.bookingIds!);
    expect(bookings.length).toBe(stored!.items.length);
    expect(bookings.every((b) => b.status === "confirmed")).toBe(true);
  });
});

describe("Management closes the client change and cancellation loop", () => {
  it("cancels the contract and releases inventory when a cancellation is approved", async () => {
    const cancellation = await raiseCancellation("contract-002", USERS.oakLegal);
    const before = await getContract("contract-002");

    const result = await readJson(
      await decideClientRequest(
        makeRequest(`/management/client-requests/${cancellation.id}`, {
          method: "POST",
          as: USERS.manager,
          body: { action: "approve", note: "Agreed with the client by phone." },
        }),
        clientRequestParams(cancellation.id)
      )
    );

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("approved");

    const after = await getContract("contract-002");
    expect(after?.status).toBe("cancelled");
    expect(before?.status).not.toBe("cancelled");

    const campaign = await getCampaign("contract-002");
    expect(campaign?.status).toBe("cancelled");

    const events = await serviceEventsFor("contract-002");
    expect(
      events.some(
        (e) => e.type === "client_request_approved" && e.clientVisible === true
      )
    ).toBe(true);
  });

  it("leaves the contract in place when a cancellation is declined", async () => {
    const cancellation = await raiseCancellation("contract-002", USERS.oakLegal);

    const result = await readJson(
      await decideClientRequest(
        makeRequest(`/management/client-requests/${cancellation.id}`, {
          method: "POST",
          as: USERS.manager,
          body: { action: "decline", note: "Inside the minimum term." },
        }),
        clientRequestParams(cancellation.id)
      )
    );

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("declined");

    const after = await getContract("contract-002");
    expect(after?.status).toBe("active");
  });

  it("returns a contract to issued when its change request is declined", async () => {
    await contractAction(
      makeRequest("/client/contracts/contract-001/actions", {
        method: "POST",
        as: USERS.lighthouse,
        body: { action: "request_changes", note: "Please move the start date." },
        idempotencyKey: nextIdempotencyKey(),
      }),
      contractParams("contract-001")
    );

    const requests = await clientRequestsFor("contract-001");
    const change = requests.find((r) => r.type === "contract_change")!;

    const result = await readJson(
      await decideClientRequest(
        makeRequest(`/management/client-requests/${change.id}`, {
          method: "POST",
          as: USERS.manager,
          body: { action: "decline", note: "That window is already booked." },
        }),
        clientRequestParams(change.id)
      )
    );

    expect(result.status).toBe(200);

    const after = await getContract("contract-001");
    expect(after?.status).toBe("issued");
    expect(after?.version).toBe(1);
  });

  it("resolves an open change request when management reissues", async () => {
    await contractAction(
      makeRequest("/client/contracts/contract-001/actions", {
        method: "POST",
        as: USERS.lighthouse,
        body: { action: "request_changes", note: "Please move the start date." },
        idempotencyKey: nextIdempotencyKey(),
      }),
      contractParams("contract-001")
    );

    await issueContract(
      makeRequest("/management/contracts/contract-001/issue", {
        method: "POST",
        as: USERS.manager,
      }),
      contractParams("contract-001")
    );

    const requests = await clientRequestsFor("contract-001");
    expect(requests.every((r) => r.status !== "submitted")).toBe(true);
  });

  it("refuses to decide the same client request twice", async () => {
    const cancellation = await raiseCancellation("contract-002", USERS.oakLegal);

    await decideClientRequest(
      makeRequest(`/management/client-requests/${cancellation.id}`, {
        method: "POST",
        as: USERS.manager,
        body: { action: "decline" },
      }),
      clientRequestParams(cancellation.id)
    );

    const second = await readJson(
      await decideClientRequest(
        makeRequest(`/management/client-requests/${cancellation.id}`, {
          method: "POST",
          as: USERS.manager,
          body: { action: "approve" },
        }),
        clientRequestParams(cancellation.id)
      )
    );

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ALREADY_DECIDED");
  });

  it("refuses a client session on the client-request decision route", async () => {
    const cancellation = await raiseCancellation("contract-002", USERS.oakLegal);

    const result = await readJson(
      await decideClientRequest(
        makeRequest(`/management/client-requests/${cancellation.id}`, {
          method: "POST",
          as: USERS.oakLegal,
          body: { action: "approve" },
        }),
        clientRequestParams(cancellation.id)
      )
    );

    expect(result.status).toBe(403);
  });

  it("refuses a second open cancellation request on the same contract", async () => {
    await raiseCancellation("contract-002", USERS.oakLegal);

    const second = await readJson(
      await contractAction(
        makeRequest("/client/contracts/contract-002/actions", {
          method: "POST",
          as: USERS.oakLegal,
          body: { action: "request_cancellation", note: "Still want out." },
          idempotencyKey: nextIdempotencyKey(),
        }),
        contractParams("contract-002")
      )
    );

    expect(second.status).toBe(409);
  });
});

describe("Contract completion", () => {
  it("refuses to complete while a work order is still open", async () => {
    const result = await readJson(
      await completeContract(
        makeRequest("/management/contracts/contract-002/complete", {
          method: "POST",
          as: USERS.manager,
        }),
        contractParams("contract-002")
      )
    );

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("WORK_ORDERS_OPEN");
  });

  it("refuses to complete a contract that is not active", async () => {
    const result = await readJson(
      await completeContract(
        makeRequest("/management/contracts/contract-001/complete", {
          method: "POST",
          as: USERS.manager,
        }),
        contractParams("contract-001")
      )
    );

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("INVALID_TRANSITION");
  });

  it("refuses a client session on the completion route", async () => {
    const result = await readJson(
      await completeContract(
        makeRequest("/management/contracts/contract-002/complete", {
          method: "POST",
          as: USERS.oakLegal,
        }),
        contractParams("contract-002")
      )
    );

    expect(result.status).toBe(403);
  });
});

describe("Client-visible service events are sanitized", () => {
  it("never returns an internal-only service event to the client", async () => {
    await insertServiceEvent({
      id: "event-internal-only",
      organisationId: "org-oak-legal",
      contractId: "contract-002",
      campaignId: "campaign-002",
      workOrderId: "work-order-001",
      at: "2027-01-14T10:00:00Z",
      type: "internal_note",
      title: "Margin renegotiated with the media owner",
      clientVisible: false,
      clientSummary: null,
    });

    const result = await readJson(
      await getClientContract(
        makeRequest("/client/contracts/contract-002", { as: USERS.oakLegal }),
        contractParams("contract-002")
      )
    );

    expect(result.status).toBe(200);

    const ids = result.body.serviceEvents.map((event: any) => event.id);
    expect(ids).not.toContain("event-internal-only");
    expect(result.body.serviceEvents.every((event: any) => event.clientVisible)).toBe(
      true
    );
    expect(JSON.stringify(result.body)).not.toContain("Margin renegotiated");
  });

  it("does not leak work-order internal notes into the client payload", async () => {
    const result = await readJson(
      await getClientContract(
        makeRequest("/client/contracts/contract-002", { as: USERS.oakLegal }),
        contractParams("contract-002")
      )
    );

    const raw = JSON.stringify(result.body);

    expect(result.status).toBe(200);
    expect(raw).not.toContain("internalNotes");
    expect(raw).not.toContain("Depot contact details");
  });

  it("does not leak another organisation's records into the client payload", async () => {
    const result = await readJson(
      await getClientContract(
        makeRequest("/client/contracts/contract-002", { as: USERS.oakLegal }),
        contractParams("contract-002")
      )
    );

    const raw = JSON.stringify(result.body);

    expect(raw).not.toContain("org-lighthouse");
    expect(raw).not.toContain("org-silverline");
    expect(raw).not.toContain("contract-001");
  });
});
