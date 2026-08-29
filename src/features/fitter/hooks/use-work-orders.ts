"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  FitterWorkOrderDetail,
  FitterWorkOrderList,
} from "@/features/fitter/lib/types";

export const workOrderKeys = {
  all: ["mobile", "work-orders"] as const,
  list: () => [...workOrderKeys.all, "list"] as const,
  detail: (workOrderId: string) =>
    [...workOrderKeys.all, "detail", workOrderId] as const,
};

export const useWorkOrders = () =>
  useQuery({
    queryKey: workOrderKeys.list(),
    queryFn: () => apiFetch<FitterWorkOrderList>("/mobile/work-orders"),
  });

export const useWorkOrder = (workOrderId: string) =>
  useQuery({
    queryKey: workOrderKeys.detail(workOrderId),
    queryFn: () =>
      apiFetch<FitterWorkOrderDetail>(`/mobile/work-orders/${workOrderId}`),
    enabled: Boolean(workOrderId),
  });
