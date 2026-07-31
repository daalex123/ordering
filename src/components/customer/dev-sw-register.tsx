"use client";

import { useEffect } from "react";
import { subscribeDeferredInstallPrompt } from "@/lib/pwa-install";

/**
 * Registers a no-cache service worker in development so Chrome can fire
 * `beforeinstallprompt` (Serwist is disabled during `next dev`).
 */
export function DevSwRegister() {
  useEffect(() => {
    // Start capturing the install event as early as possible.
    const unsub = subscribeDeferredInstallPrompt(() => {});

    if (process.env.NODE_ENV !== "development") {
      return unsub;
    }
    if (!("serviceWorker" in navigator)) {
      return unsub;
    }

    void navigator.serviceWorker
      .register("/sw-dev.js", { scope: "/" })
      .catch(() => {
        /* ignore — install UI still shows manual steps */
      });

    return unsub;
  }, []);

  return null;
}
