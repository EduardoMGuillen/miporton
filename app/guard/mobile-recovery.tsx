"use client";

import { useEffect, useRef } from "react";

export function GuardMobileRecovery() {
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      if (!hiddenAt) return;

      const elapsed = Date.now() - hiddenAt;
      // If app returns after a short pause/background, reload to recover camera cleanly.
      if (elapsed > 1200) {
        window.location.reload();
      }
    }

    function onPageShow(event: PageTransitionEvent) {
      // iOS/Safari can restore from bfcache; force a clean camera init.
      if (event.persisted) {
        window.location.reload();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
