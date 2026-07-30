"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "kb_install_dismissed";
export const PENDING_INSTALL_KEY = "kb_pending_install";

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

export function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  // Always capture the install event (including during welcome).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  // Show only on the first app screen after welcome.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (shouldHideOnPath(pathname)) {
      setVisible(false);
      setIosHint(false);
      return;
    }

    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
      if (window.localStorage.getItem(PENDING_INSTALL_KEY) !== "1") return;
    } catch {
      return;
    }

    if (isStandaloneDisplay()) return;

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    const timer = window.setTimeout(() => {
      if (isIos && isSafari) {
        setIosHint(true);
      } else {
        setVisible(true);
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
      window.localStorage.removeItem(PENDING_INSTALL_KEY);
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
