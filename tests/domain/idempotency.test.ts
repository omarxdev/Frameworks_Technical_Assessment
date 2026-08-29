import { describe, it, expect } from "vitest";
import { validateIdempotencyKey } from "@/lib/domain/idempotency";

describe("Idempotency Validation", () => {
  it("accepts valid keys of 8 or more characters", () => {
    expect(validateIdempotencyKey("seed-request-001")).toBe(true);
    expect(validateIdempotencyKey("12345678")).toBe(true);
    expect(validateIdempotencyKey("custom-key-xyz")).toBe(true);
  });

  it("rejects keys shorter than 8 characters, null, or empty", () => {
    expect(validateIdempotencyKey("")).toBe(false);
    expect(validateIdempotencyKey(null)).toBe(false);
    expect(validateIdempotencyKey(undefined)).toBe(false);
    expect(validateIdempotencyKey("short")).toBe(false);
    expect(validateIdempotencyKey("1234567")).toBe(false);
  });
});
