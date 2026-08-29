import type { WorkOrderStatus } from "@/lib/schemas";

export const VALID_WORK_ORDER_TRANSITIONS: Record<
  WorkOrderStatus,
  WorkOrderStatus[]
> = {
  draft: ["assigned"],
  assigned: ["travelling", "on_site", "blocked"],
  travelling: ["on_site", "blocked", "assigned"],
  on_site: ["completed", "blocked", "travelling"],
  blocked: ["assigned", "travelling", "on_site"],
  completed: [],
};

export const canTransitionWorkOrder = (
  from: WorkOrderStatus,
  to: WorkOrderStatus
) => VALID_WORK_ORDER_TRANSITIONS[from].includes(to);

export interface WorkOrderTransitionContext {
  note?: string | null;
  completionNote?: string | null;
  proofCount?: number;
}

export interface WorkOrderTransitionResult {
  valid: boolean;
  code?: "INVALID_TRANSITION" | "REASON_REQUIRED" | "PROOF_REQUIRED";
  error?: string;
}

export const validateWorkOrderStatusUpdate = (
  currentStatus: WorkOrderStatus,
  targetStatus: WorkOrderStatus,
  context: string | null | undefined | WorkOrderTransitionContext = {}
): WorkOrderTransitionResult => {
  const ctx: WorkOrderTransitionContext =
    typeof context === "string" || context === null || context === undefined
      ? { note: context }
      : context;

  if (!canTransitionWorkOrder(currentStatus, targetStatus)) {
    return {
      valid: false,
      code: "INVALID_TRANSITION",
      error: `Cannot transition work order from '${currentStatus}' to '${targetStatus}'`,
    };
  }

  if (targetStatus === "blocked" && !ctx.note?.trim()) {
    return {
      valid: false,
      code: "REASON_REQUIRED",
      error: "A blocked update requires a reason note.",
    };
  }

  if (targetStatus === "completed") {
    const note = ctx.completionNote?.trim() || ctx.note?.trim();
    if (!note) {
      return {
        valid: false,
        code: "PROOF_REQUIRED",
        error: "Completing a job requires a completion note.",
      };
    }

    if (!ctx.proofCount || ctx.proofCount < 1) {
      return {
        valid: false,
        code: "PROOF_REQUIRED",
        error:
          "Completing a job requires at least one proof attachment. Upload proof before marking the job complete.",
      };
    }
  }

  return { valid: true };
};
