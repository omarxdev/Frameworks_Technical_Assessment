import type {
  AssetOption,
  AvailabilitySummary,
  Campaign,
  Contract,
  ContractSummary,
  HistoryEntry,
  IndicativeRate,
  Organisation,
  ProductSearchResult,
  ProofRecord,
  ServiceEvent,
} from "@/lib/schemas";

export type PortalAttentionPriority = "high" | "normal";

export interface PortalAttentionItem {
  type: string;
  title: string;
  message: string;
  contractId?: string | null;
  priority: PortalAttentionPriority;
}

export interface PortalSummary {
  organisation: Organisation;
  contracts: ContractSummary[];
  attentionItems: PortalAttentionItem[];
  recentServiceEvents: ServiceEvent[];
}

export interface CatalogueFilters {
  startDate: string;
  endDate: string;
  mediaType: string;
  locationId: string;
  maxMonthlyBudget: string;
}

export interface ProductListResponse {
  query: {
    startDate: string;
    endDate: string;
    mediaType: string | null;
    locationId: string | null;
    maxMonthlyBudget: number | null;
  };
  items: ProductSearchResult[];
}

export interface PortalProductDetail extends ProductSearchResult {
  description: string;
  creativeSpec: Record<string, unknown> | null;
  assetOptions: AssetOption[];
}

export interface PortalClientRequest {
  id: string;
  organisationId: string;
  contractId: string;
  type: string;
  status: string;
  createdAt: string;
  summary: string;
  history: HistoryEntry[];
}

export interface PortalContractDetail extends Contract {
  campaign: Campaign | null;
  serviceEvents: ServiceEvent[];
  proofRecords: ProofRecord[];
  clientRequests: PortalClientRequest[];
}

export interface PortalContractListResponse {
  items: ContractSummary[];
}

export interface BookingRequestPayload {
  productId: string;
  requestedAssetId?: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  objective: string;
  notes?: string | null;
}

export interface BookingRequestCreated {
  id: string;
  productId: string;
  requestedAssetId: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  objective: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

export type ContractActionName = "accept" | "request_changes" | "request_cancellation";

export interface ContractActionInput {
  action: ContractActionName;
  note?: string;
}

export type { AssetOption, AvailabilitySummary, IndicativeRate };
