import { z } from "zod";

// Base Types
export const UserRoleSchema = z.enum(["client", "manager", "fitter"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  organisationId: z.string().nullable().optional(),
  status: z.string().default("active"),
});
export type User = z.infer<typeof UserSchema>;

export const OrganisationSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  contractCount: z.number().int().min(0).default(0),
});
export type Organisation = z.infer<typeof OrganisationSchema>;

export const SessionSchema = z.object({
  user: UserSchema,
  organisation: OrganisationSchema.nullable().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const RegisterInputSchema = z.object({
  organisationName: z.string().min(2, "Organisation name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  email: z.string().email("Valid email address is required"),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

// Media Owners & Locations
export const MediaOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type MediaOwner = z.infer<typeof MediaOwnerSchema>;

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Location = z.infer<typeof LocationSchema>;

// Indicative Rates & Creative Specs
export const IndicativeRateSchema = z.object({
  currency: z.literal("GBP").default("GBP"),
  amount: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  monthlyEquivalent: z.number().nullable().optional(),
  label: z.string(),
});
export type IndicativeRate = z.infer<typeof IndicativeRateSchema>;

export const CreativeSpecSchema = z.record(z.any()).nullable().optional();
export type CreativeSpec = z.infer<typeof CreativeSpecSchema>;

// Availability
export const AvailabilityStateSchema = z.enum([
  "available",
  "unavailable",
  "confirmation_required",
]);
export type AvailabilityState = z.infer<typeof AvailabilityStateSchema>;

export const AvailabilityBlockerSchema = z.object({
  kind: z.enum(["booking", "hold", "outage"]),
  id: z.string(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});
export type AvailabilityBlocker = z.infer<typeof AvailabilityBlockerSchema>;

export const AvailabilitySummarySchema = z.object({
  state: AvailabilityStateSchema,
  reason: z.string(),
  calculatedAt: z.string(),
  availableAssetCount: z.number().int().nullable().optional(),
  availableCapacity: z.number().int().nullable().optional(),
  totalCapacity: z.number().int().nullable().optional(),
  freshestVerificationAt: z.string().nullable().optional(),
  verificationStale: z.boolean().optional(),
  blockers: z.array(AvailabilityBlockerSchema).optional(),
});
export type AvailabilitySummary = z.infer<typeof AvailabilitySummarySchema>;

// Products & Assets
export const AllocationModelSchema = z.enum(["exclusive_asset", "capacity_pool"]);
export type AllocationModel = z.infer<typeof AllocationModelSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  mediaOwnerId: z.string(),
  mediaType: z.string(),
  locationIds: z.array(z.string()),
  allocationModel: AllocationModelSchema,
  capacityPoolId: z.string().optional(),
  description: z.string(),
  indicativeRate: IndicativeRateSchema,
  minimumTermDays: z.number().int().min(1),
  creativeSpec: CreativeSpecSchema,
});
export type Product = z.infer<typeof ProductSchema>;

export const AssetSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  locationId: z.string(),
  status: z.enum(["active", "retired"]).default("active"),
  verifiedAt: z.string().nullable().optional(),
  verificationSource: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const AssetOptionSchema = AssetSchema.extend({
  availability: AvailabilitySummarySchema,
});
export type AssetOption = z.infer<typeof AssetOptionSchema>;

export const CapacityPoolSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  locationId: z.string(),
  capacity: z.number().int().min(1),
  status: z.enum(["active", "retired"]).default("active"),
  verifiedAt: z.string().nullable().optional(),
  verificationSource: z.string().nullable().optional(),
});
export type CapacityPool = z.infer<typeof CapacityPoolSchema>;

// Product Search Results & Queries
export const ProductSearchQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  mediaType: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  maxMonthlyBudget: z.coerce.number().min(0).nullable().optional(),
});
export type ProductSearchQuery = z.infer<typeof ProductSearchQuerySchema>;

export const ProductSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  mediaOwnerName: z.string(),
  mediaType: z.string(),
  locationNames: z.array(z.string()),
  allocationModel: AllocationModelSchema,
  indicativeRate: IndicativeRateSchema,
  minimumTermDays: z.number().int(),
  availability: AvailabilitySummarySchema,
});
export type ProductSearchResult = z.infer<typeof ProductSearchResultSchema>;

export const ProductDetailSchema = ProductSearchResultSchema.extend({
  description: z.string(),
  creativeSpec: CreativeSpecSchema,
  assetOptions: z.array(AssetOptionSchema),
});
export type ProductDetail = z.infer<typeof ProductDetailSchema>;

// Bookings, Holds & Outages
export const BookingSchema = z.object({
  id: z.string(),
  campaignName: z.string(),
  productId: z.string(),
  assetId: z.string().nullable().optional(),
  capacityPoolId: z.string().nullable().optional(),
  capacityUnits: z.number().int().optional(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["confirmed", "cancelled"]).default("confirmed"),
});
export type Booking = z.infer<typeof BookingSchema>;

export const HoldSchema = z.object({
  id: z.string(),
  productId: z.string(),
  assetId: z.string().nullable().optional(),
  capacityPoolId: z.string().nullable().optional(),
  capacityUnits: z.number().int().optional(),
  startDate: z.string(),
  endDate: z.string(),
  expiresAt: z.string(),
  status: z.enum(["active", "released", "expired"]).default("active"),
});
export type Hold = z.infer<typeof HoldSchema>;

export const OutageSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  status: z.enum(["confirmed", "resolved"]).default("confirmed"),
});
export type Outage = z.infer<typeof OutageSchema>;

// History Entries
export const HistoryEntrySchema = z.object({
  at: z.string(),
  actor: z.string(),
  action: z.string(),
  note: z.string().nullable().optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

// Booking Requests
export const BookingRequestStatusSchema = z.enum([
  "submitted",
  "information_required",
  "approved",
  "declined",
]);
export type BookingRequestStatus = z.infer<typeof BookingRequestStatusSchema>;

export const BookingRequestCreateSchema = z.object({
  productId: z.string(),
  requestedAssetId: z.string().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  budget: z.coerce.number().min(0),
  objective: z.string().min(5, "Objective must be at least 5 characters"),
  notes: z.string().nullable().optional(),
});
export type BookingRequestCreate = z.infer<typeof BookingRequestCreateSchema>;

export const BookingRequestSchema = BookingRequestCreateSchema.extend({
  id: z.string(),
  organisationId: z.string(),
  idempotencyKey: z.string().optional(),
  status: BookingRequestStatusSchema,
  createdAt: z.string(),
  draftContractId: z.string().nullable().optional(),
  history: z.array(HistoryEntrySchema),
  advertiser: z
    .object({
      name: z.string(),
      contactName: z.string(),
      email: z.string(),
    })
    .optional(),
});
export type BookingRequest = z.infer<typeof BookingRequestSchema>;

export const BookingRequestSummarySchema = z.object({
  id: z.string(),
  organisationName: z.string(),
  productName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  createdAt: z.string(),
  attentionReason: z.string().nullable().optional(),
});
export type BookingRequestSummary = z.infer<typeof BookingRequestSummarySchema>;

export const BookingRequestDetailSchema = BookingRequestSchema.extend({
  organisation: OrganisationSchema,
  product: ProductSearchResultSchema,
  currentAvailability: AvailabilitySummarySchema,
});
export type BookingRequestDetail = z.infer<typeof BookingRequestDetailSchema>;

export const ManagementDecisionSchema = z.object({
  action: z.enum(["request_information", "approve", "decline"]),
  note: z.string().nullable().optional(),
  selectedAssetId: z.string().nullable().optional(),
});
export type ManagementDecision = z.infer<typeof ManagementDecisionSchema>;

// Contracts
export const ContractStatusSchema = z.enum([
  "draft",
  "issued",
  "change_requested",
  "accepted",
  "active",
  "completed",
  "cancelled",
]);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const ContractItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  assetId: z.string().nullable().optional(),
  capacityPoolId: z.string().nullable().optional(),
  quantity: z.number().int().default(1),
  unitRate: z.number().nullable().optional(),
  rateUnit: z.string().nullable().optional(),
  lineTotal: z.number().min(0),
});
export type ContractItem = z.infer<typeof ContractItemSchema>;

export const ContractCreateSchema = z.object({
  organisationId: z.string(),
  bookingRequestId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(ContractItemSchema).min(1),
  total: z.number().min(0),
});
export type ContractCreate = z.infer<typeof ContractCreateSchema>;

export const ContractSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  bookingRequestId: z.string().nullable().optional(),
  status: ContractStatusSchema,
  version: z.number().int().default(1),
  startDate: z.string(),
  endDate: z.string(),
  currency: z.literal("GBP").default("GBP"),
  total: z.number().min(0),
  issuedAt: z.string().nullable().optional(),
  acceptedAt: z.string().nullable().optional(),
  activatedAt: z.string().nullable().optional(),
  items: z.array(ContractItemSchema),
  history: z.array(HistoryEntrySchema),
});
export type Contract = z.infer<typeof ContractSchema>;

export const ContractSummarySchema = z.object({
  id: z.string(),
  status: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  total: z.number(),
  actionRequired: z.string().nullable().optional(),
});
export type ContractSummary = z.infer<typeof ContractSummarySchema>;

export const ClientContractActionSchema = z.object({
  action: z.enum(["accept", "request_changes", "request_cancellation"]),
  note: z.string().nullable().optional(),
});
export type ClientContractAction = z.infer<typeof ClientContractActionSchema>;

// Campaigns
export const CampaignStatusSchema = z.enum([
  "awaiting_contract_acceptance",
  "active",
  "completed",
  "cancelled",
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  contractId: z.string(),
  bookingId: z.string().nullable().optional(),
  name: z.string(),
  status: CampaignStatusSchema,
  currentStage: z.string(),
  clientVisible: z.boolean().default(true),
});
export type Campaign = z.infer<typeof CampaignSchema>;

// Service Events & Proof
export const ServiceEventSchema = z.object({
  id: z.string(),
  organisationId: z.string().optional(),
  contractId: z.string().optional(),
  campaignId: z.string().nullable().optional(),
  workOrderId: z.string().nullable().optional(),
  at: z.string(),
  type: z.string(),
  title: z.string(),
  clientVisible: z.boolean().default(true),
  clientSummary: z.string().nullable().optional(),
});
export type ServiceEvent = z.infer<typeof ServiceEventSchema>;

export const ProofRecordSchema = z.object({
  id: z.string(),
  workOrderId: z.string(),
  fileName: z.string(),
  previewUrl: z.string().nullable().optional(),
  completionNote: z.string().optional(),
  createdAt: z.string(),
  createdByUserId: z.string(),
});
export type ProofRecord = z.infer<typeof ProofRecordSchema>;

export const ClientContractDetailSchema = ContractSchema.extend({
  campaign: CampaignSchema.nullable().optional(),
  serviceEvents: z.array(ServiceEventSchema).default([]),
  proofRecords: z.array(ProofRecordSchema).default([]),
  clientRequests: z.array(z.record(z.any())).default([]),
});
export type ClientContractDetail = z.infer<typeof ClientContractDetailSchema>;

export const ClientSummarySchema = z.object({
  organisation: OrganisationSchema,
  contracts: z.array(ContractSummarySchema),
  attentionItems: z.array(z.record(z.any())),
  recentServiceEvents: z.array(ServiceEventSchema),
});
export type ClientSummary = z.infer<typeof ClientSummarySchema>;

// Work Orders
export const WorkOrderTypeSchema = z.enum([
  "survey",
  "production",
  "installation",
  "maintenance",
  "removal",
]);
export type WorkOrderType = z.infer<typeof WorkOrderTypeSchema>;

export const WorkOrderStatusSchema = z.enum([
  "draft",
  "assigned",
  "travelling",
  "on_site",
  "blocked",
  "completed",
]);
export type WorkOrderStatus = z.infer<typeof WorkOrderStatusSchema>;

export const WorkOrderCreateSchema = z.object({
  campaignId: z.string(),
  contractId: z.string(),
  type: WorkOrderTypeSchema,
  assignedUserId: z.string(),
  assetId: z.string(),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  locationLabel: z.string(),
  instructions: z.string(),
  internalNotes: z.string().optional(),
});
export type WorkOrderCreate = z.infer<typeof WorkOrderCreateSchema>;

export const WorkOrderSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  contractId: z.string(),
  organisationId: z.string(),
  type: WorkOrderTypeSchema,
  status: WorkOrderStatusSchema,
  assignedUserId: z.string(),
  assetId: z.string(),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  locationLabel: z.string(),
  instructions: z.string(),
  internalNotes: z.string().optional(),
  completionNote: z.string().nullable().optional(),
  proofRecordIds: z.array(z.string()).default([]),
  history: z.array(HistoryEntrySchema),
});
export type WorkOrder = z.infer<typeof WorkOrderSchema>;

export const WorkOrderStatusUpdateSchema = z.object({
  status: z.enum(["assigned", "travelling", "on_site", "blocked", "completed"]),
  note: z.string().nullable().optional(),
});
export type WorkOrderStatusUpdate = z.infer<typeof WorkOrderStatusUpdateSchema>;

// Dashboard & Errors
export const ManagementDashboardSchema = z.object({
  attentionItems: z.array(z.record(z.any())),
  counts: z.record(z.number()),
  upcomingWorkOrders: z.array(WorkOrderSchema),
});
export type ManagementDashboard = z.infer<typeof ManagementDashboardSchema>;

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).nullable().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
