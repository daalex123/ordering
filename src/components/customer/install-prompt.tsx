"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  consumeDeferredInstallPrompt,
  subscribeDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

const DISMISS_KEY = "kb_install_dismissed";

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function shouldHideOnPath(pathname: string) {
  return (
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/launch") ||
    pathname.startsWith("/admin")
  );
}

function detectIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

/** Bottom install banner for visitors who have not installed yet. */
export function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => subscribeDeferredInstallPrompt(setDeferred), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (shouldHideOnPath(pathname)) {
      setVisible(false);
      setIosHint(false);
      return;
    }

    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* private mode — still show */
    }

    if (isStandaloneDisplay()) return;

    const ios = detectIosSafari();
    const timer = window.setTimeout(() => {
      if (ios) {
        setIosHint(true);
        setVisible(false);
      } else {
        setIosHint(false);
        setVisible(true);
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Show as soon as Chrome hands us an install event (even before the delay).
  useEffect(() => {
    if (!deferred) return;
    if (shouldHideOnPath(pathname)) return;
    if (isStandaloneDisplay()) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
    setIosHint(false);
  }, [deferred, pathname]);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
    setIosHint(false);
  }

  async function install() {
    const promptEvent = deferred ?? consumeDeferredInstallPrompt();
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    dismiss();
  }

  if (shouldHideOnPath(pathname)) return null;
  if (!visible && !iosHint) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[76px] z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl bg-[#391713] px-4 py-3 text-white shadow-lg">
        <Image
          src="/logo-kings-bakamuna.png"
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-xl object-cover"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install Kings Bakamuna</p>
          <p className="text-[11px] leading-snug text-white/75">
            {iosHint
              ? "Tap Share, then Add to Home Screen"
              : deferred
                ? "Add to your home screen for quicker ordering"
                : "Open the browser menu → Install app"}
          </p>
        </div>
        {deferred && !iosHint ? (
          <button
            type="button"
            onClick={() => void install()}
            className="shrink-0 rounded-full bg-[#F5CB58] px-3 py-1.5 text-xs font-bold text-[#391713]"
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-lg leading-none text-white/60"
        >
          ×
        </button>
      </div>
    </div>
  );
}
