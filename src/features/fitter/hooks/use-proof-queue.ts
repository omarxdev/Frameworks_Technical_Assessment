"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiRequestError, apiFetch, newIdempotencyKey } from "@/lib/api-client";
import {
  useUploadQueueStore,
  type QueuedUpload,
} from "@/stores/use-upload-queue-store";
import { useOnlineStatus } from "@/features/fitter/hooks/use-online-status";
import { workOrderKeys } from "@/features/fitter/hooks/use-work-orders";
import { useSignalStore } from "@/features/fitter/store/use-signal-store";
import {
  dataUrlToFile,
  readFileAsDataUrl,
  validateProofFile,
} from "@/features/fitter/lib/proof";

export interface QueueProofInput {
  workOrderId: string;
  file: File;
  completionNote: string;
}

const offlineMessage =
  "No connection. Proof is saved on this device and will upload automatically.";

const transientMessage =
  "The upload did not reach the server. Proof is saved on this device — retry when you have a stable signal.";

const failureMessage = (error: unknown) => {
  if (error instanceof ApiRequestError) return error.message;
  if (typeof navigator !== "undefined" && !navigator.onLine) return offlineMessage;
  return transientMessage;
};

const inFlight = new Set<string>();

export const useProofQueue = (workOrderId?: string) => {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const items = useUploadQueueStore((state) => state.items);
  const [isWorking, setIsWorking] = useState(false);

  const uploadItem = useCallback(
    async (item: QueuedUpload) => {
      if (inFlight.has(item.id)) return false;

      inFlight.add(item.id);
      setIsWorking(true);
      useUploadQueueStore.getState().markUploading(item.id);

      try {
        const file = dataUrlToFile(item.dataUrl, item.fileName, item.fileType);
        const form = new FormData();
        form.append("file", file);
        form.append("completionNote", item.completionNote);

        await apiFetch(`/mobile/work-orders/${item.workOrderId}/proof`, {
          method: "POST",
          body: form,
          idempotencyKey: item.idempotencyKey,
          headers: useSignalStore.getState().simulatePoorSignal
            ? { "x-simulate-upload-failure": "true" }
            : undefined,
        });

        useUploadQueueStore.getState().markUploaded(item.id);
        useUploadQueueStore.getState().remove(item.id);
        await queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
        return true;
      } catch (error) {
        useUploadQueueStore.getState().markFailed(item.id, failureMessage(error));
        return false;
      } finally {
        inFlight.delete(item.id);
        setIsWorking(inFlight.size > 0);
      }
    },
    [queryClient]
  );

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;

    const pending = useUploadQueueStore
      .getState()
      .items.filter((item) => item.status !== "uploaded");

    for (const item of pending) {
      await uploadItem(item);
    }
  }, [uploadItem]);

  const retry = useCallback(
    async (item: QueuedUpload) => {
      if (!navigator.onLine) {
        toast.error("Still offline. The proof stays queued on this device.");
        return false;
      }

      const uploaded = await uploadItem(item);
      if (uploaded) toast.success(`${item.fileName} uploaded`);
      else
        toast.error(
          useUploadQueueStore.getState().items.find((i) => i.id === item.id)
            ?.lastError ?? "Upload failed. Try again when you have signal."
        );

      return uploaded;
    },
    [uploadItem]
  );

  const queueProof = useCallback(
    async ({ workOrderId: id, file, completionNote }: QueueProofInput) => {
      const invalid = validateProofFile(file);
      if (invalid) {
        toast.error(invalid);
        return false;
      }

      if (completionNote.trim().length < 3) {
        toast.error("Add a completion note of at least 3 characters.");
        return false;
      }

      const dataUrl = await readFileAsDataUrl(file);
      const queuedId = newIdempotencyKey();

      useUploadQueueStore.getState().enqueue({
        id: queuedId,
        workOrderId: id,
        fileName: file.name,
        fileType: file.type,
        dataUrl,
        completionNote: completionNote.trim(),
        idempotencyKey: newIdempotencyKey(),
      });

      if (!navigator.onLine) {
        toast.info(offlineMessage);
        return true;
      }

      const queued = useUploadQueueStore
        .getState()
        .items.find((item) => item.id === queuedId);
      if (!queued) return false;

      const uploaded = await uploadItem(queued);
      if (uploaded) toast.success("Proof attached");
      else
        toast.error(
          useUploadQueueStore.getState().items.find((i) => i.id === queuedId)
            ?.lastError ?? "Upload failed. It stays queued for retry."
        );

      return uploaded;
    },
    [uploadItem]
  );

  const discard = useCallback((id: string) => {
    useUploadQueueStore.getState().remove(id);
    toast.info("Queued proof discarded");
  }, []);

  useEffect(() => {
    if (!isOnline) return;

    const onReconnect = () => {
      void flush();
    };

    onReconnect();
    window.addEventListener("online", onReconnect);
    return () => window.removeEventListener("online", onReconnect);
  }, [isOnline, flush]);

  const pending = items.filter(
    (item) =>
      item.status !== "uploaded" && (!workOrderId || item.workOrderId === workOrderId)
  );

  return {
    isOnline,
    isWorking,
    pending,
    allPending: items.filter((item) => item.status !== "uploaded"),
    queueProof,
    retry,
    discard,
    flush,
  };
};
