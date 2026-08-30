"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  BookingRequestDetail,
  BookingRequestListResponse,
  ManagementContractDetail,
  ManagementDashboardResponse,
  ManagementWorkOrderDetail,
  ProductDetailResponse,
  WorkOrderListResponse,
} from "@/features/management/lib/types";

export const managementKeys = {
  dashboard: ["management", "dashboard"] as const,
  requests: (status: string) => ["management", "requests", status] as const,
  request: (requestId: string) => ["management", "request", requestId] as const,
  product: (productId: string, startDate: string, endDate: string) =>
    ["management", "product", productId, startDate, endDate] as const,
  contract: (contractId: string) => ["management", "contract", contractId] as const,
  workOrders: (status: string) => ["management", "work-orders", status] as const,
  workOrder: (workOrderId: string) =>
    ["management", "work-order", workOrderId] as const,
};

export const useDashboard = () =>
  useQuery({
    queryKey: managementKeys.dashboard,
    queryFn: () => apiFetch<ManagementDashboardResponse>("/management/dashboard"),
  });

export const useBookingRequests = (status: string) =>
  useQuery({
    queryKey: managementKeys.requests(status),
    queryFn: () =>
      apiFetch<BookingRequestListResponse>(
        status === "all"
          ? "/management/booking-requests"
          : `/management/booking-requests?status=${status}`
      ),
  });

export const useBookingRequest = (requestId: string) =>
  useQuery({
    queryKey: managementKeys.request(requestId),
    queryFn: () =>
      apiFetch<BookingRequestDetail>(`/management/booking-requests/${requestId}`),
    enabled: Boolean(requestId),
  });

export const useProductAssetOptions = (
  productId?: string,
  startDate?: string,
  endDate?: string,
  enabled = true
) =>
  useQuery({
    queryKey: managementKeys.product(productId ?? "", startDate ?? "", endDate ?? ""),
    queryFn: () =>
      apiFetch<ProductDetailResponse>(
        `/products/${productId}?startDate=${startDate}&endDate=${endDate}`
      ),
    enabled: enabled && Boolean(productId && startDate && endDate),
  });

export const useContract = (contractId: string) =>
  useQuery({
    queryKey: managementKeys.contract(contractId),
    queryFn: () =>
      apiFetch<ManagementContractDetail>(`/management/contracts/${contractId}`),
    enabled: Boolean(contractId),
  });

export const useWorkOrders = (status: string) =>
  useQuery({
    queryKey: managementKeys.workOrders(status),
    queryFn: () =>
      apiFetch<WorkOrderListResponse>(
        status === "all"
          ? "/management/work-orders"
          : `/management/work-orders?status=${status}`
      ),
  });

export const useWorkOrder = (workOrderId: string) =>
  useQuery({
    queryKey: managementKeys.workOrder(workOrderId),
    queryFn: () =>
      apiFetch<ManagementWorkOrderDetail>(`/management/work-orders/${workOrderId}`),
    enabled: Boolean(workOrderId),
  });
