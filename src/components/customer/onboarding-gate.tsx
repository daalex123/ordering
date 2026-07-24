"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "kb_onboarded";

/** First visit → splash; returning users skip onboarding. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/launch") || pathname.startsWith("/welcome")) {
      return;
    }
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        router.replace("/launch");
      }
    } catch {
      // private mode / blocked storage — stay on page
    }
  }, [pathname, router]);

  return <>{children}</>;
}
