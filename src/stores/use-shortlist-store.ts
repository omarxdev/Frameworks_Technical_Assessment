"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ShortlistEntry {
  productId: string;
  productName: string;
  rateLabel: string;
  startDate: string;
  endDate: string;
  addedAt: string;
}

interface ShortlistState {
  items: ShortlistEntry[];
  add: (entry: ShortlistEntry) => void;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
}

export const useShortlistStore = create<ShortlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (entry) =>
        set((state) =>
          state.items.some((i) => i.productId === entry.productId)
            ? state
            : { items: [...state.items, entry] }
        ),
      remove: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      clear: () => set({ items: [] }),
      has: (productId) => get().items.some((i) => i.productId === productId),
    }),
    { name: "island-media-shortlist" }
  )
);
