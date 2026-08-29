import { describe, it, expect } from "vitest";
import { evaluateExclusiveAssetAvailability } from "@/lib/domain/availability/exclusiveAsset";
import { FIXTURE_CLOCK_DATE } from "@/lib/constants";
import fixtures from "../../fixtures/island-media-fixtures.json";
import type { Asset, Booking, Hold, Outage } from "@/lib/schemas";

describe("Exclusive Asset Availability Engine", () => {
  const assets = fixtures.assets as Asset[];
  const bookings = fixtures.bookings as Booking[];
  const holds = fixtures.holds as Hold[];
  const outages = fixtures.outages as Outage[];

  it("evaluates request-001 (Bus rear panel: 2027-02-12 to 2027-02-18) as UNAVAILABLE (all 3 assets blocked)", () => {
    // Bus rear panel has 3 active assets:
    // - Bus 101 rear: booked 2027-02-01 to 2027-03-01 (booking-001)
    // - Bus 102 rear: booked 2027-02-15 to 2027-04-01 (booking-002)
    // - Bus 103 rear: outage 2027-02-10 to 2027-02-20 (outage-001)
    const result = evaluateExclusiveAssetAvailability({
      productId: "product-bus-rear",
      startDate: "2027-02-12",
      endDate: "2027-02-18",
      assets,
      bookings,
      holds,
      outages,
      clock: FIXTURE_CLOCK_DATE,
    });

    expect(result.summary.state).toBe("unavailable");
    expect(result.summary.availableAssetCount).toBe(0);
    expect(result.assetOptions.every((a) => a.availability.state === "unavailable")).toBe(true);
  });

  it("evaluates Bus rear panel as AVAILABLE when an unblocked window is requested", () => {
    // Request window after Bus 101/103 are free and before hold-003
    // Bus 103 rear has hold from 2027-03-05 to 2027-03-15
    // Between 2027-04-02 and 2027-05-01, assets are free
    const result = evaluateExclusiveAssetAvailability({
      productId: "product-bus-rear",
      startDate: "2027-04-02",
      endDate: "2027-05-01",
      assets,
      bookings,
      holds,
      outages,
      clock: FIXTURE_CLOCK_DATE,
    });

    expect(result.summary.state).toBe("available");
    expect(result.summary.availableAssetCount).toBeGreaterThan(0);
  });

  it("flags an asset whose verification is over 30 days old as confirmation_required", () => {
    const result = evaluateExclusiveAssetAvailability({
      productId: "product-hub-door",
      startDate: "2027-01-20",
      endDate: "2027-02-20",
      assets,
      bookings,
      holds,
      outages,
      clock: FIXTURE_CLOCK_DATE,
    });

    const doorB = result.assetOptions.find((a) => a.id === "asset-door-b");
    const doorA = result.assetOptions.find((a) => a.id === "asset-door-a");

    expect(doorB?.availability.state).toBe("confirmation_required");
    expect(doorB?.availability.verificationStale).toBe(true);
    expect(doorA?.availability.state).toBe("available");
    expect(doorA?.availability.verificationStale).toBe(false);
  });

  it("flags the stale EV screen that carries no advisory note", () => {
    const result = evaluateExclusiveAssetAvailability({
      productId: "product-ev-screen",
      startDate: "2027-03-01",
      endDate: "2027-04-01",
      assets,
      bookings,
      holds,
      outages,
      clock: FIXTURE_CLOCK_DATE,
    });

    const stale = result.assetOptions.find((a) => a.id === "asset-ev-screen-02");

    expect(stale?.note).toBeUndefined();
    expect(stale?.availability.state).toBe("confirmation_required");
  });

  it("names every blocker so management can see why a window is closed", () => {
    const result = evaluateExclusiveAssetAvailability({
      productId: "product-bus-rear",
      startDate: "2027-02-12",
      endDate: "2027-02-18",
      assets,
      bookings,
      holds,
      outages,
      clock: FIXTURE_CLOCK_DATE,
    });

    const kinds = (result.summary.blockers ?? []).map((b) => b.kind);

    expect(result.summary.blockers).toHaveLength(3);
    expect(kinds).toContain("booking");
    expect(kinds).toContain("outage");
  });

  it("ignores retired assets such as Bus 202 full wrap", () => {
    const result = evaluateExclusiveAssetAvailability({
      productId: "product-bus-wrap",
      startDate: "2027-08-01",
      endDate: "2027-09-01",
      assets,
      bookings,
      holds,
      outages,
      clock: FIXTURE_CLOCK_DATE,
    });

    // Only active assets should be considered
    const retiredAsset = result.assetOptions.find((a) => a.id === "asset-bus-202-wrap");
    expect(retiredAsset).toBeUndefined();
  });
});
