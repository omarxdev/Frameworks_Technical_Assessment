import { beforeAll, describe, expect, it } from "vitest";
import { POST as submitBookingRequest } from "@/app/api/booking-requests/route";
import { GET as searchProducts } from "@/app/api/products/route";
import { GET as clientSummary } from "@/app/api/client/summary/route";
import { makeRequest, readJson, reseed, USERS } from "../helpers/harness";

const validBody = {
  productId: "product-hub-door",
  startDate: "2027-06-01",
  endDate: "2027-09-01",
  budget: 4000,
  objective: "Spring awareness campaign",
};

beforeAll(async () => {
  await reseed();
});

describe("Required check 4: duplicate booking-request submission", () => {
  it("returns the existing record when the same idempotency key is replayed", async () => {
    const key = "duplicate-key-check-001";

    const first = await readJson(
      await submitBookingRequest(
        makeRequest("/booking-requests", {
          method: "POST",
          as: USERS.silverline,
          idempotencyKey: key,
          body: validBody,
        })
      )
    );

    const second = await readJson(
      await submitBookingRequest(
        makeRequest("/booking-requests", {
          method: "POST",
          as: USERS.silverline,
          idempotencyKey: key,
          body: validBody,
        })
      )
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it("creates a distinct record for a new idempotency key", async () => {
    const first = await readJson(
      await submitBookingRequest(
        makeRequest("/booking-requests", {
          method: "POST",
          as: USERS.silverline,
          idempotencyKey: "distinct-key-aaa",
          body: validBody,
        })
      )
    );

    const second = await readJson(
      await submitBookingRequest(
        makeRequest("/booking-requests", {
          method: "POST",
          as: USERS.silverline,
          idempotencyKey: "distinct-key-bbb",
          body: validBody,
        })
      )
    );

    expect(second.body.id).not.toBe(first.body.id);
  });

  it("rejects reuse of one key with a different body", async () => {
    const key = "reused-key-check-001";

    await submitBookingRequest(
      makeRequest("/booking-requests", {
        method: "POST",
        as: USERS.silverline,
        idempotencyKey: key,
        body: validBody,
      })
    );

    const conflicting = await readJson(
      await submitBookingRequest(
        makeRequest("/booking-requests", {
          method: "POST",
          as: USERS.silverline,
          idempotencyKey: key,
          body: { ...validBody, budget: 9999 },
        })
      )
    );

    expect(conflicting.status).toBe(409);
    expect(conflicting.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("requires an idempotency key", async () => {
    const result = await readJson(
      await submitBookingRequest(
        makeRequest("/booking-requests", {
          method: "POST",
          as: USERS.silverline,
          body: validBody,
        })
      )
    );

    expect(result.status).toBe(422);
  });
});

describe("Required check 5: a client with no contracts can still use the catalogue", () => {
  it("gives the zero-contract organisation a usable portal summary", async () => {
    const summary = await readJson(
      await clientSummary(makeRequest("/client/summary", { as: USERS.silverline }))
    );

    expect(summary.status).toBe(200);
    expect(summary.body.organisation.id).toBe("org-silverline");
    expect(summary.body.contracts).toHaveLength(0);
    expect(Array.isArray(summary.body.attentionItems)).toBe(true);
  });

  it("returns the full catalogue to that client", async () => {
    const products = await readJson(
      await searchProducts(
        makeRequest("/products?startDate=2027-06-01&endDate=2027-07-01", {
          as: USERS.silverline,
        })
      )
    );

    expect(products.status).toBe(200);
    expect(products.body.items.length).toBeGreaterThan(0);
  });

  it("lets that client submit a booking request without any contract", async () => {
    const result = await readJson(
      await submitBookingRequest(
        makeRequest("/booking-requests", {
          method: "POST",
          as: USERS.silverline,
          idempotencyKey: "no-contract-client-request",
          body: validBody,
        })
      )
    );

    expect(result.status).toBe(201);
    expect(result.body.organisationId).toBe("org-silverline");
    expect(result.body.status).toBe("submitted");
  });
});

describe("Rate handling in the budget filter", () => {
  it("excludes a price-on-request product from a budget-filtered search", async () => {
    const unfiltered = await readJson(
      await searchProducts(
        makeRequest("/products?startDate=2027-06-01&endDate=2027-07-01")
      )
    );

    const filtered = await readJson(
      await searchProducts(
        makeRequest(
          "/products?startDate=2027-06-01&endDate=2027-07-01&maxMonthlyBudget=5000"
        )
      )
    );

    const idsOf = (result: any) => result.body.items.map((i: any) => i.id);

    expect(idsOf(unfiltered)).toContain("product-ev-screen");
    expect(idsOf(filtered)).not.toContain("product-ev-screen");
  });

  it("keeps the native rate label rather than deriving a price", async () => {
    const products = await readJson(
      await searchProducts(
        makeRequest("/products?startDate=2027-06-01&endDate=2027-07-01")
      )
    );

    const ev = products.body.items.find((i: any) => i.id === "product-ev-screen");

    expect(ev.indicativeRate.amount).toBeNull();
    expect(ev.indicativeRate.label).toBe("Price on request");
  });
});
