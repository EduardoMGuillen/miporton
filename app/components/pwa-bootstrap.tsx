"use client";

import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () =>
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => registration.update().catch(() => registration))
        .catch(() => {});

    // Avoid competing with first paint, but keep push ready soon.
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }
  }, []);

  return null;
}
