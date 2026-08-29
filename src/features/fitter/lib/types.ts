import type {
  HistoryEntry,
  ProofRecord,
  WorkOrderStatus,
  WorkOrderType,
} from "@/lib/schemas";

export interface FitterWorkOrder {
  id: string;
  campaignId: string;
  contractId: string;
  organisationId: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  assignedUserId: string;
  assetId: string;
  assetName: string;
  scheduledStart: string;
  scheduledEnd: string;
  locationLabel: string;
  instructions: string;
  completionNote?: string | null;
  proofRecordIds: string[];
  history: HistoryEntry[];
}

export interface FitterWorkOrderDetail extends FitterWorkOrder {
  proofRecords: ProofRecord[];
}

export interface FitterWorkOrderList {
  items: FitterWorkOrder[];
}
