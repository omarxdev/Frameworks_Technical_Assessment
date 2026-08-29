"use client";

import { create } from "zustand";

interface SignalState {
  simulatePoorSignal: boolean;
  setSimulatePoorSignal: (value: boolean) => void;
  toggleSimulatePoorSignal: () => void;
}

export const useSignalStore = create<SignalState>()((set) => ({
  simulatePoorSignal: false,
  setSimulatePoorSignal: (value) => set({ simulatePoorSignal: value }),
  toggleSimulatePoorSignal: () =>
    set((state) => ({ simulatePoorSignal: !state.simulatePoorSignal })),
}));
