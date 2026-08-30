import { FIXTURE_CLOCK, FIXTURE_CLOCK_DATE } from "@/lib/constants";
import { pluralise } from "@/lib/format";
import { hasHalfOpenOverlap } from "./date-range";
import { isHoldActive } from "./exclusive-asset";
import type { CapacityPool, Booking, Hold, AvailabilitySummary } from "@/lib/schemas";

export interface CapacityPoolAvailabilityResult {
  summary: AvailabilitySummary;
}

export const evaluateCapacityPoolAvailability = (params: {
  productId: string;
  startDate: string;
  endDate: string;
  pools: CapacityPool[];
  bookings: Booking[];
  holds: Hold[];
  clock?: Date;
}): CapacityPoolAvailabilityResult => {
  const clock = params.clock || FIXTURE_CLOCK_DATE;
  const pool = params.pools.find(
    (p) => p.productId === params.productId && p.status === "active"
  );

  if (!pool) {
    return {
      summary: {
        state: "unavailable",
        reason: "No active capacity pool configured for this product",
        calculatedAt: FIXTURE_CLOCK,
        availableCapacity: 0,
        totalCapacity: 0,
      },
    };
  }

  const overlappingBookings = params.bookings.filter(
    (b) =>
      b.capacityPoolId === pool.id &&
      b.status === "confirmed" &&
      hasHalfOpenOverlap(params.startDate, params.endDate, b.startDate, b.endDate)
  );
  const bookedUnits = overlappingBookings.reduce(
    (sum, b) => sum + (b.capacityUnits || 1),
    0
  );

  const overlappingHolds = params.holds.filter(
    (h) =>
      h.capacityPoolId === pool.id &&
      isHoldActive(h, clock) &&
      hasHalfOpenOverlap(params.startDate, params.endDate, h.startDate, h.endDate)
  );
  const heldUnits = overlappingHolds.reduce(
    (sum, h) => sum + (h.capacityUnits || 1),
    0
  );

  const totalUsed = bookedUnits + heldUnits;
  const availableCapacity = Math.max(0, pool.capacity - totalUsed);

  const isAvailable = availableCapacity > 0;
  const state: "available" | "unavailable" = isAvailable ? "available" : "unavailable";

  let reason = `${availableCapacity} of ${pluralise(pool.capacity, "slot")} available in the network loop.`;
  if (!isAvailable) {
    reason = `Capacity pool is fully allocated (${bookedUnits} booked, ${heldUnits} on active hold) for selected dates`;
  }

  return {
    summary: {
      state,
      reason,
      calculatedAt: FIXTURE_CLOCK,
      availableCapacity,
      totalCapacity: pool.capacity,
      freshestVerificationAt: pool.verifiedAt || null,
    },
  };
};
