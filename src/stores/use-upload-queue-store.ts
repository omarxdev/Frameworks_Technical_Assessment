"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QueuedUploadStatus = "queued" | "uploading" | "failed" | "uploaded";

export interface QueuedUpload {
  id: string;
  workOrderId: string;
  fileName: string;
  fileType: string;
  dataUrl: string;
  completionNote: string;
  idempotencyKey: string;
  status: QueuedUploadStatus;
  attempts: number;
  lastError: string | null;
  queuedAt: string;
}

interface UploadQueueState {
  items: QueuedUpload[];
  enqueue: (
    item: Omit<QueuedUpload, "status" | "attempts" | "lastError" | "queuedAt">
  ) => void;
  markUploading: (id: string) => void;
  markUploaded: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  remove: (id: string) => void;
  pendingFor: (workOrderId: string) => QueuedUpload[];
}

export const useUploadQueueStore = create<UploadQueueState>()(
  persist(
    (set, get) => ({
      items: [],
      enqueue: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              status: "queued",
              attempts: 0,
              lastError: null,
              queuedAt: new Date().toISOString(),
            },
          ],
        })),
      markUploading: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, status: "uploading", attempts: i.attempts + 1 } : i
          ),
        })),
      markUploaded: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, status: "uploaded", lastError: null } : i
          ),
        })),
      markFailed: (id, error) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, status: "failed", lastError: error } : i
          ),
        })),
      remove: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      pendingFor: (workOrderId) =>
        get().items.filter(
          (i) => i.workOrderId === workOrderId && i.status !== "uploaded"
        ),
    }),
    { name: "island-media-upload-queue" }
  )
);
