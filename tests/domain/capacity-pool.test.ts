import { describe, it, expect } from "vitest";
import { evaluateCapacityPoolAvailability } from "@/lib/domain/availability/capacity-pool";
import { isHoldActive } from "@/lib/domain/availability/exclusive-asset";
import { FIXTURE_CLOCK_DATE } from "@/lib/constants";
import fixtures from "../../fixtures/island-media-fixtures.json";
import type { CapacityPool, Booking, Hold } from "@/lib/schemas";

describe("Capacity Pool Availability Engine", () => {
  const pools = fixtures.capacityPools as CapacityPool[];
  const bookings = fixtures.bookings as Booking[];
  const holds = fixtures.holds as Hold[];

  it("proves hold-002 is EXPIRED relative to fixture clock and ignored", () => {
    const hold001 = holds.find((h) => h.id === "hold-001")!;
    const hold002 = holds.find((h) => h.id === "hold-002")!;

    expect(isHoldActive(hold001, FIXTURE_CLOCK_DATE)).toBe(true);
    expect(isHoldActive(hold002, FIXTURE_CLOCK_DATE)).toBe(false);
  });

  it("evaluates Hub portrait screen network as UNAVAILABLE during 2027-02-20 to 2027-02-28 (exactly 4/4 capacity used)", () => {
    const result = evaluateCapacityPoolAvailability({
      productId: "product-hub-screen",
      startDate: "2027-02-20",
      endDate: "2027-02-28",
      pools,
      bookings,
      holds,
      clock: FIXTURE_CLOCK_DATE,
    });

    expect(result.summary.state).toBe("unavailable");
    expect(result.summary.availableCapacity).toBe(0);
    expect(result.summary.totalCapacity).toBe(4);
  });

  it("evaluates Hub portrait screen network as AVAILABLE when capacity is open", () => {
    const result = evaluateCapacityPoolAvailability({
      productId: "product-hub-screen",
      startDate: "2027-04-01",
      endDate: "2027-05-01",
      pools,
      bookings,
      holds,
      clock: FIXTURE_CLOCK_DATE,
    });

    expect(result.summary.state).toBe("available");
    expect(result.summary.availableCapacity).toBe(4);
  });
});
