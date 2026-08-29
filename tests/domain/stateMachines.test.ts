import { describe, it, expect } from "vitest";
import { canTransitionContract } from "@/lib/domain/contracts/stateMachine";
import {
  canTransitionWorkOrder,
  validateWorkOrderStatusUpdate,
} from "@/lib/domain/workOrders/stateMachine";

describe("Contract State Machine", () => {
  it("allows valid transitions: draft -> issued -> accepted -> active -> completed", () => {
    expect(canTransitionContract("draft", "issued")).toBe(true);
    expect(canTransitionContract("issued", "accepted")).toBe(true);
    expect(canTransitionContract("issued", "change_requested")).toBe(true);
    expect(canTransitionContract("accepted", "active")).toBe(true);
    expect(canTransitionContract("active", "completed")).toBe(true);
  });

  it("disallows invalid jumps (e.g. draft directly to completed or active)", () => {
    expect(canTransitionContract("draft", "completed")).toBe(false);
    expect(canTransitionContract("draft", "active")).toBe(false);
    expect(canTransitionContract("completed", "active")).toBe(false);
  });
});

describe("Work Order State Machine", () => {
  it("allows sequential progression: assigned -> travelling -> on_site -> completed", () => {
    expect(canTransitionWorkOrder("assigned", "travelling")).toBe(true);
    expect(canTransitionWorkOrder("travelling", "on_site")).toBe(true);
    expect(canTransitionWorkOrder("on_site", "completed")).toBe(true);
  });

  it("requires a reason when transitioning to blocked state", () => {
    // Missing reason note
    const invalidUpdate = validateWorkOrderStatusUpdate("on_site", "blocked", "");
    expect(invalidUpdate.valid).toBe(false);
    expect(invalidUpdate.error).toContain("reason");

    // With reason note
    const validUpdate = validateWorkOrderStatusUpdate(
      "on_site",
      "blocked",
      "Depot gate locked; awaiting access from site security"
    );
    expect(validUpdate.valid).toBe(true);
  });
});
