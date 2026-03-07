"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const standaloneFromMedia = window.matchMedia("(display-mode: standalone)").matches;
  const standaloneFromNavigator = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return standaloneFromMedia || standaloneFromNavigator;
}

export function StandaloneLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isStandaloneMode()) return;
    router.replace("/login");
  }, [router]);

  return null;
}
