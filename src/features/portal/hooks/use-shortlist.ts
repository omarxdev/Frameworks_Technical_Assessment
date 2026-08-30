"use client";

import { useSyncExternalStore } from "react";
import { useShortlistStore } from "@/stores/use-shortlist-store";

const subscribeToNothing = () => () => {};

const getHydratedSnapshot = () => true;

const getServerSnapshot = () => false;

export const useHydrated = () =>
  useSyncExternalStore(subscribeToNothing, getHydratedSnapshot, getServerSnapshot);

export const useShortlistCount = () => {
  const hydrated = useHydrated();
  const count = useShortlistStore((state) => state.items.length);

  if (!hydrated) return 0;
  return count;
};

export const useIsShortlisted = (productId: string) => {
  const hydrated = useHydrated();
  const shortlisted = useShortlistStore((state) =>
    state.items.some((item) => item.productId === productId)
  );

  if (!hydrated) return false;
  return shortlisted;
};
