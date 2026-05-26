"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 45000;
const REFRESH_DEBOUNCE_MS = 8000;
const SCROLL_IDLE_MS = 1500;

export function GuardAutoRefresh() {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);
  const lastScrollAtRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      lastScrollAtRef.current = Date.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const refreshIfNeeded = () => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < REFRESH_DEBOUNCE_MS) return;
      if (now - lastScrollAtRef.current < SCROLL_IDLE_MS) return;
      lastRefreshAtRef.current = now;
      router.refresh();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "MI_VISITA_NEW_VISIT") {
        refreshIfNeeded();
      }
    };

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshIfNeeded();
      }
    }, REFRESH_INTERVAL_MS);

    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearInterval(pollTimer);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [router]);

  return null;
}
