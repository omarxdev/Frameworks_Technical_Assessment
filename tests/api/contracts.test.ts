import { beforeEach, describe, expect, it } from "vitest";
import { GET as getClientContract } from "@/app/api/client/contracts/[contractId]/route";
import { POST as contractAction } from "@/app/api/client/contracts/[contractId]/actions/route";
import { POST as issueContract } from "@/app/api/management/contracts/[contractId]/issue/route";
import { PATCH as decideRequest } from "@/app/api/management/booking-requests/[requestId]/route";
import {
  getContract,
  makeRequest,
  readJson,
  reseed,
  serviceEventsFor,
  USERS,
} from "../helpers/harness";

const contractParams = (contractId: string) => ({
  params: Promise.resolve({ contractId }),
});

const requestParams = (requestId: string) => ({
  params: Promise.resolve({ requestId }),
});

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
      }),
      contractParams("contract-001")
    );

    const second = await readJson(
      await contractAction(
        makeRequest("/client/contracts/contract-001/actions", {
          method: "POST",
          as: USERS.lighthouse,
          body: { action: "accept" },
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
