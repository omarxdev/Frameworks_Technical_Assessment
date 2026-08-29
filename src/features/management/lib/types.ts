import type {
  AssetOption,
  AvailabilityBlocker,
  AvailabilitySummary,
  BookingRequestDetail,
  BookingRequestSummary,
  Campaign,
  Contract,
  ContractItem,
  HistoryEntry,
  ProofRecord,
  ServiceEvent,
  WorkOrder,
} from "@/lib/schemas";

export type AttentionPriority = "urgent" | "high" | "normal";

export interface AttentionItem {
  id: string;
  type: string;
  priority: AttentionPriority;
  title: string;
  message: string;
  link?: string | null;
  entityId?: string | null;
}

export interface ManagementDashboardResponse {
  attentionItems: AttentionItem[];
  counts: Record<string, number>;
  upcomingWorkOrders: WorkOrder[];
}

export interface BookingRequestListResponse {
  items: BookingRequestSummary[];
}

export interface ProductDetailResponse {
  id: string;
  name: string;
  allocationModel: "exclusive_asset" | "capacity_pool";
  indicativeRate: { label: string; amount?: number | null; unit?: string | null };
  availability: AvailabilitySummary;
  assetOptions: AssetOption[];
}

export interface ManagementWorkOrder extends WorkOrder {
  assetName: string;
  assignedUserName: string;
  proofRecords: ProofRecord[];
}

export interface WorkOrderReferences {
  assets: { id: string; name: string; productId: string; status: string }[];
  contracts: {
    id: string;
    status: string;
    organisationId: string;
    startDate: string;
    endDate: string;
  }[];
  campaigns: {
    id: string;
    name: string;
    contractId: string;
    organisationId: string;
    status: string;
  }[];
}

export interface WorkOrderListResponse {
  items: ManagementWorkOrder[];
  references: WorkOrderReferences;
}

export interface ManagementContractDetail extends Contract {
  organisationName: string;
  campaign: Campaign | null;
  workOrders: WorkOrder[];
  serviceEvents: ServiceEvent[];
  clientRequests: Record<string, unknown>[];
}

export interface DecisionPayload {
  action: "approve" | "decline" | "request_information";
  note?: string | null;
  selectedAssetId?: string | null;
}

export interface ContractCreatePayload {
  organisationId: string;
  bookingRequestId: string;
  startDate: string;
  endDate: string;
  items: ContractItem[];
  total: number;
}

export interface WorkOrderCreatePayload {
  campaignId: string;
  contractId: string;
  type: string;
  assignedUserId: string;
  assetId: string;
  scheduledStart: string;
  scheduledEnd: string;
  locationLabel: string;
  instructions: string;
  internalNotes?: string;
}

export type { AvailabilityBlocker, BookingRequestDetail, ContractItem, HistoryEntry };
