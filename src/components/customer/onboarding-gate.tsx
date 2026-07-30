"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "kb_onboarded";

/** First visit → welcome; returning users skip it. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/welcome") || pathname.startsWith("/launch")) {
      return;
    }
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        router.replace("/welcome");
      }
    } catch {
      // private mode / blocked storage — stay on page
    }
  }, [pathname, router]);

  return <>{children}</>;
}
