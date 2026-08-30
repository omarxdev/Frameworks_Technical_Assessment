"use client";

import { useEffect } from "react";

export const useServiceWorker = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/fitter" })
      .catch(() => {});
  }, []);
};
