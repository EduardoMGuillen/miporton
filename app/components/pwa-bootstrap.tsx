"use client";

import { useEffect } from "react";

/**
 * Igual que gcbmesas ServiceWorkerRegister:
 * el SW debe estar activo antes de pedir permiso / subscribe (PWA en inicio).
 */
export function PwaBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => {})
      .catch(() => {});
  }, []);

  return null;
}
