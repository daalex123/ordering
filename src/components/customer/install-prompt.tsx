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
    <div className="pointer-events-none fixed inset-x-0 bottom-[96px] z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-[20px] border-2 border-[var(--glass-accent)] bg-[#1A0E08] px-4 py-3 text-white shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
        <Image
          src="/logo-kings-bakamuna.png"
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-[12px] border border-white/25 object-cover"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-white">
            Install Kings Bakamuna
          </p>
          <p className="text-[11px] leading-snug text-white/70">
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
            className="glass-cta shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold"
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[16px] leading-none text-white transition hover:bg-white/25"
        >
          ×
        </button>
      </div>
    </div>
  );
}
