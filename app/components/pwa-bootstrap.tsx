"use client";

import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration("/")
      .then((existing) => {
        if (existing?.active) return existing;
        return navigator.serviceWorker.register("/sw.js", { scope: "/" });
      })
      .catch(() => {});
  }, []);

  return null;
}
