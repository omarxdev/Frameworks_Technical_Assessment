import type { WorkOrderStatus } from "@/lib/schemas";

export const VALID_WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ["assigned"],
  assigned: ["travelling", "on_site", "blocked"],
  travelling: ["on_site", "blocked", "assigned"],
  on_site: ["completed", "blocked", "travelling"],
  blocked: ["assigned", "travelling", "on_site"],
  completed: [],
};

export function canTransitionWorkOrder(
  from: WorkOrderStatus,
  to: WorkOrderStatus
): boolean {
  const allowed = VALID_WORK_ORDER_TRANSITIONS[from];
  return allowed.includes(to);
}

export function validateWorkOrderStatusUpdate(
  currentStatus: WorkOrderStatus,
  targetStatus: WorkOrderStatus,
  note?: string | null
): { valid: boolean; error?: string } {
  if (!canTransitionWorkOrder(currentStatus, targetStatus)) {
    return {
      valid: false,
      error: `Cannot transition work order from '${currentStatus}' to '${targetStatus}'`,
    };
  }

  if (targetStatus === "blocked" && (!note || note.trim().length === 0)) {
    return {
      valid: false,
      error: "A blocked update requires a reason note.",
    };
  }

  return { valid: true };
}
