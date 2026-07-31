"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type LaunchParams = {
  targetURL?: string;
};

type LaunchQueue = {
  setConsumer: (consumer: (params: LaunchParams) => void) => void;
};

/**
 * When Chrome launches the installed PWA for an in-scope URL (e.g. SMS order
 * link), navigate the existing standalone window to that path.
 */
export function PwaLaunchHandler() {
  const router = useRouter();

  useEffect(() => {
    const launchQueue = (window as Window & { launchQueue?: LaunchQueue })
      .launchQueue;
    if (!launchQueue) return;

    launchQueue.setConsumer((launchParams) => {
      const target = launchParams.targetURL;
      if (!target) return;

      try {
        const url = new URL(target);
        if (url.origin !== window.location.origin) return;

        const next = `${url.pathname}${url.search}${url.hash}`;
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (next === current) return;

        router.push(next);
      } catch {
        // Ignore malformed launch URLs.
      }
    });
  }, [router]);

  return null;
}
