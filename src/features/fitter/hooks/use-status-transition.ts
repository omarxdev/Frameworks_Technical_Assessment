"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiRequestError, apiFetch, newIdempotencyKey } from "@/lib/api-client";
import { humanise } from "@/components/ui/status-pill";
import { workOrderKeys } from "@/features/fitter/hooks/use-work-orders";
import type { FitterWorkOrder } from "@/features/fitter/lib/types";
import type { WorkOrderStatus } from "@/lib/schemas";

export interface StatusTransitionInput {
  status: WorkOrderStatus;
  note?: string | null;
}

export const useStatusTransition = (workOrderId: string) => {
  const queryClient = useQueryClient();

  return useMutation<FitterWorkOrder, ApiRequestError, StatusTransitionInput>({
    mutationFn: ({ status, note }) =>
      apiFetch<FitterWorkOrder>(`/mobile/work-orders/${workOrderId}/status`, {
        method: "POST",
        body: { status, note: note?.trim() || null },
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: (_data, { status }) => {
      toast.success(`Job marked ${humanise(status).toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
