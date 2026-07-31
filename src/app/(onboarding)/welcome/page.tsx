"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BrandLogo } from "@/components/customer/brand-logo";
import {
  consumeDeferredInstallPrompt,
  subscribeDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

const ONBOARDED_KEY = "kb_onboarded";
const DISMISS_KEY = "kb_install_dismissed";

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function detectIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

/** First visit: logo splash, then home-screen download, then menu. */
export default function WelcomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"splash" | "install">("splash");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [waitingForPrompt, setWaitingForPrompt] = useState(true);

  useEffect(() => {
    return subscribeDeferredInstallPrompt(setDeferred);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(ONBOARDED_KEY, "1");
        if (isStandaloneDisplay()) {
          router.replace("/");
          return;
        }
        setIosHint(detectIosSafari());
        setPhase("install");
      } catch {
        router.replace("/");
      }
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [router]);

  // Give the service worker a moment to become installable before fallback copy.
  useEffect(() => {
    if (phase !== "install" || iosHint) {
      setWaitingForPrompt(false);
      return;
    }
    if (deferred) {
      setWaitingForPrompt(false);
      return;
    }
    setWaitingForPrompt(true);
    const timer = window.setTimeout(() => setWaitingForPrompt(false), 2500);
    return () => window.clearTimeout(timer);
  }, [phase, iosHint, deferred]);

  function goToMenu() {
    router.replace("/");
  }

  function finishInstalled() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    router.replace("/");
  }

  async function install() {
    const promptEvent = deferred ?? consumeDeferredInstallPrompt();
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        finishInstalled();
      } else {
        setInstalling(false);
      }
    } catch {
      setInstalling(false);
    }
  }

  if (phase === "splash") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F5CB58] px-8">
        <BrandLogo priority size={180} />
        <p className="mt-5 text-center text-[28px] font-bold tracking-wide">
          <span className="text-[#E95322]">Kings</span>{" "}
          <span className="text-[#F8F8F8]">Bakamuna</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F5CB58] px-6 pb-10 pt-14">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="rounded-[28px] bg-white p-5 shadow-[0_12px_40px_rgba(57,23,19,0.12)]">
          <Image
            src="/logo-kings-bakamuna.png"
            alt=""
            width={88}
            height={88}
            className="mx-auto size-[88px] rounded-2xl object-cover"
            unoptimized
            priority
          />
          <h1 className="mt-4 text-[22px] font-bold text-[#391713]">
            Add to Home Screen
          </h1>
          <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-[#391713]/75">
            {iosHint
              ? "Tap Share, then Add to Home Screen for one-tap ordering."
              : "Install Kings Bakamuna like an app for faster ordering."}
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        {iosHint ? (
          <div className="rounded-2xl bg-[#391713] px-4 py-3 text-left text-sm text-white">
            <p className="font-semibold">On iPhone / iPad</p>
            <p className="mt-1 text-white/75">
              Tap the Share button, then choose{" "}
              <span className="font-semibold text-[#F5CB58]">
                Add to Home Screen
              </span>
              .
            </p>
          </div>
        ) : deferred ? (
          <button
            type="button"
            disabled={installing}
            onClick={() => void install()}
            className="flex h-12 items-center justify-center rounded-full bg-[#E95322] text-base font-semibold text-white shadow-[0_8px_20px_rgba(233,83,34,0.28)] disabled:opacity-70"
          >
            {installing ? "Installing…" : "Download app"}
          </button>
        ) : waitingForPrompt ? (
          <button
            type="button"
            disabled
            className="flex h-12 items-center justify-center rounded-full bg-[#E95322] text-base font-semibold text-white opacity-70"
          >
            Preparing download…
          </button>
        ) : (
          <div className="rounded-2xl bg-[#391713] px-4 py-3 text-left text-sm text-white">
            <p className="font-semibold">Install from your browser</p>
            <p className="mt-1 text-white/75">
              Open the browser menu and choose{" "}
              <span className="font-semibold text-[#F5CB58]">Install app</span>{" "}
              or{" "}
              <span className="font-semibold text-[#F5CB58]">
                Add to Home Screen
              </span>
              .
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={goToMenu}
          className="flex h-12 items-center justify-center rounded-full bg-white text-base font-semibold text-[#391713]"
        >
          Continue to menu
        </button>
      </div>
    </div>
  );
}
