"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "kb_install_dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIos && isSafari) {
      const t = window.setTimeout(() => setIosHint(true), 2500);
      return () => window.clearTimeout(t);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
    setIosHint(false);
    setDeferred(null);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

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
              : "Add to your home screen for quicker ordering"}
          </p>
        </div>
        {deferred ? (
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
