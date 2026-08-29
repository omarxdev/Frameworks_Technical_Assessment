import type { ContractStatus } from "@/lib/schemas";

export const VALID_CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ["issued", "cancelled"],
  issued: ["accepted", "change_requested", "cancelled"],
  change_requested: ["draft", "issued", "cancelled"],
  accepted: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionContract(
  from: ContractStatus,
  to: ContractStatus
): boolean {
  const allowed = VALID_CONTRACT_TRANSITIONS[from];
  return allowed.includes(to);
}
