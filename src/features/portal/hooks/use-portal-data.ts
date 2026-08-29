"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError, apiFetch, newIdempotencyKey } from "@/lib/api-client";
import {
  filtersToSearchParams,
  isValidRange,
} from "@/features/portal/lib/catalogue-options";
import type {
  BookingRequestCreated,
  BookingRequestPayload,
  CatalogueFilters,
  ContractActionInput,
  PortalContractDetail,
  PortalContractListResponse,
  PortalProductDetail,
  PortalSummary,
  ProductListResponse,
} from "@/features/portal/lib/types";

export const portalKeys = {
  summary: ["portal", "summary"] as const,
  products: (filters: CatalogueFilters) =>
    ["portal", "products", filters] as const,
  product: (productId: string, startDate: string, endDate: string) =>
    ["portal", "product", productId, startDate, endDate] as const,
  contracts: ["portal", "contracts"] as const,
  contract: (contractId: string) =>
    ["portal", "contract", contractId] as const,
};

export const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const errorCode = (error: unknown) =>
  error instanceof ApiRequestError ? error.code : null;

export const isAuthError = (error: unknown) => {
  if (!(error instanceof ApiRequestError)) return false;
  return error.status === 401 || error.code === "UNAUTHENTICATED";
};

export const useClientSummary = () =>
  useQuery({
    queryKey: portalKeys.summary,
    queryFn: () => apiFetch<PortalSummary>("/client/summary"),
  });

export const useCatalogue = (filters: CatalogueFilters) =>
  useQuery({
    queryKey: portalKeys.products(filters),
    queryFn: () =>
      apiFetch<ProductListResponse>(
        `/products?${filtersToSearchParams(filters).toString()}`
      ),
    enabled: isValidRange(filters.startDate, filters.endDate),
  });

export const useProductDetail = (
  productId: string,
  startDate: string,
  endDate: string
) =>
  useQuery({
    queryKey: portalKeys.product(productId, startDate, endDate),
    queryFn: () =>
      apiFetch<PortalProductDetail>(
        `/products/${productId}?startDate=${startDate}&endDate=${endDate}`
      ),
    enabled: isValidRange(startDate, endDate),
  });

export const useClientContracts = () =>
  useQuery({
    queryKey: portalKeys.contracts,
    queryFn: () =>
      apiFetch<PortalContractListResponse>("/client/contracts"),
  });

export const useContractDetail = (contractId: string) =>
  useQuery({
    queryKey: portalKeys.contract(contractId),
    queryFn: () =>
      apiFetch<PortalContractDetail>(`/client/contracts/${contractId}`),
  });

export const useBookingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BookingRequestPayload) =>
      apiFetch<BookingRequestCreated>("/booking-requests", {
        method: "POST",
        body: payload,
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.summary });
    },
  });
};

export const useContractAction = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, note }: ContractActionInput) =>
      apiFetch<PortalContractDetail>(
        `/client/contracts/${contractId}/actions`,
        {
          method: "POST",
          body: note?.trim() ? { action, note: note.trim() } : { action },
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.contract(contractId) });
      queryClient.invalidateQueries({ queryKey: portalKeys.contracts });
      queryClient.invalidateQueries({ queryKey: portalKeys.summary });
    },
  });
};
