"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiRequestError, apiFetch, newIdempotencyKey } from "@/lib/api-client";
import { managementKeys } from "@/features/management/hooks/use-management-data";
import type {
  ClientRequestDecisionPayload,
  ContractCreatePayload,
  DecisionPayload,
  ManagementContractDetail,
  WorkOrderCreatePayload,
} from "@/features/management/lib/types";
import type {
  AvailabilityBlocker,
  BookingRequest,
  ClientRequest,
  Contract,
  WorkOrder,
} from "@/lib/schemas";

export const asApiError = (error: unknown) =>
  error instanceof ApiRequestError ? error : null;

export const blockersFromError = (error: unknown): AvailabilityBlocker[] => {
  const apiError = asApiError(error);
  if (!apiError) return [];
  const details = apiError.details as { blockers?: AvailabilityBlocker[] } | undefined;
  return details?.blockers ?? [];
};

export const useRequestDecision = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DecisionPayload) =>
      apiFetch<BookingRequest>(`/management/booking-requests/${requestId}`, {
        method: "PATCH",
        body: payload,
      }),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: managementKeys.request(requestId) });
      queryClient.invalidateQueries({ queryKey: ["management", "requests"] });
      queryClient.invalidateQueries({ queryKey: managementKeys.dashboard });
      toast.success(
        payload.action === "approve"
          ? "Request approved"
          : payload.action === "decline"
            ? "Request declined"
            : "Information requested from the client"
      );
    },
    onError: (error) => {
      const apiError = asApiError(error);
      toast.error(apiError?.message ?? "The decision could not be recorded.");
    },
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ContractCreatePayload) =>
      apiFetch<Contract>("/management/contracts", {
        method: "POST",
        body: payload,
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: (contract, payload) => {
      queryClient.invalidateQueries({
        queryKey: managementKeys.request(payload.bookingRequestId),
      });
      queryClient.invalidateQueries({ queryKey: managementKeys.dashboard });
      queryClient.invalidateQueries({
        queryKey: managementKeys.contract(contract.id),
      });
      toast.success(`Draft contract ${contract.id} created`);
    },
    onError: (error) => {
      const apiError = asApiError(error);
      toast.error(apiError?.message ?? "The draft contract could not be created.");
    },
  });
};

export const useIssueContract = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<ManagementContractDetail>(`/management/contracts/${contractId}/issue`, {
        method: "POST",
      }),
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: managementKeys.contract(contractId) });
      queryClient.invalidateQueries({ queryKey: managementKeys.dashboard });
      toast.success(`Contract issued to the client as version ${contract.version}`);
    },
    onError: (error) => {
      const apiError = asApiError(error);
      toast.error(apiError?.message ?? "The contract could not be issued.");
    },
  });
};

export const useCreateWorkOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WorkOrderCreatePayload) =>
      apiFetch<WorkOrder>("/management/work-orders", {
        method: "POST",
        body: payload,
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: (workOrder) => {
      queryClient.invalidateQueries({ queryKey: ["management", "work-orders"] });
      queryClient.invalidateQueries({ queryKey: managementKeys.dashboard });
      queryClient.invalidateQueries({
        queryKey: managementKeys.contract(workOrder.contractId),
      });
      toast.success(`Work order ${workOrder.id} assigned`);
    },
    onError: (error) => {
      const apiError = asApiError(error);
      toast.error(apiError?.message ?? "The work order could not be created.");
    },
  });
};

export const useCompleteContract = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note?: string) =>
      apiFetch<ManagementContractDetail>(
        `/management/contracts/${contractId}/complete`,
        { method: "POST", body: { note: note ?? "" } }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managementKeys.contract(contractId) });
      queryClient.invalidateQueries({ queryKey: managementKeys.dashboard });
      toast.success("Contract completed and the client has been told");
    },
    onError: (error) => {
      const apiError = asApiError(error);
      toast.error(apiError?.message ?? "The contract could not be completed.");
    },
  });
};

export const useDecideClientRequest = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientRequestId,
      ...payload
    }: ClientRequestDecisionPayload & { clientRequestId: string }) =>
      apiFetch<ClientRequest & { contractStatus: string }>(
        `/management/client-requests/${clientRequestId}`,
        { method: "POST", body: payload }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: managementKeys.contract(contractId) });
      queryClient.invalidateQueries({ queryKey: managementKeys.dashboard });
      toast.success(
        variables.action === "approve"
          ? "Client request approved"
          : "Client request declined"
      );
    },
    onError: (error) => {
      const apiError = asApiError(error);
      toast.error(apiError?.message ?? "The decision could not be recorded.");
    },
  });
};
