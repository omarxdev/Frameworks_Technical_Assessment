import type {
  AssetOption,
  AttentionItem,
  AttentionPriority,
  AvailabilityBlocker,
  AvailabilitySummary,
  BookingRequest,
  BookingRequestDetail,
  BookingRequestSummary,
  Campaign,
  ClientRequest,
  Contract,
  ContractItem,
  HistoryEntry,
  Organisation,
  ProofRecord,
  ServiceEvent,
  WorkOrder,
} from "@/lib/schemas";

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

export interface ManagementWorkOrderDetail extends ManagementWorkOrder {
  organisationName: string;
  campaignName: string | null;
  serviceEvents: ServiceEvent[];
}

export interface ManagementContractWorkOrder extends WorkOrder {
  proofRecords: ProofRecord[];
}

export interface ManagementContractDetail extends Contract {
  organisationName: string;
  campaign: Campaign | null;
  workOrders: ManagementContractWorkOrder[];
  proofRecords: ProofRecord[];
  serviceEvents: ServiceEvent[];
  clientRequests: ClientRequest[];
}

export interface OrganisationSummary extends Organisation {
  contact: { name: string; email: string } | null;
  pendingRequestCount: number;
}

export interface OrganisationListResponse {
  items: OrganisationSummary[];
}

export interface OrganisationDetail extends Organisation {
  contacts: { id: string; name: string; email: string; status: string }[];
  contracts: Contract[];
  bookingRequests: BookingRequest[];
}

export interface ClientRequestDecisionPayload {
  action: "approve" | "decline";
  note?: string | null;
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

export type {
  AttentionItem,
  AttentionPriority,
  AvailabilityBlocker,
  BookingRequestDetail,
  ClientRequest,
  ContractItem,
  HistoryEntry,
  ProofRecord,
};
