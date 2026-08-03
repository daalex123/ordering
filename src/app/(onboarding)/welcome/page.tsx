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
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-8">
        <div className="pointer-events-none absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full bg-[var(--glass-accent)]/25 blur-3xl" />
        <div className="glass-enter relative z-10 flex flex-col items-center">
          <div className="glass-panel-strong rounded-[28px] p-5">
            <BrandLogo priority size={140} />
          </div>
          <p className="mt-6 text-center text-[28px] font-bold tracking-wide text-white">
            Kings{" "}
            <span className="text-[var(--glass-accent)]">Bakamuna</span>
          </p>
          <p className="mt-2 text-[13px] text-white/50">Restaurant & Billiards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col px-6 pt-14 pb-10">
      <div className="pointer-events-none absolute top-10 -right-10 size-40 rounded-full bg-[var(--glass-accent)]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 -left-10 size-36 rounded-full bg-[var(--glass-accent)]/10 blur-3xl" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <div className="glass-panel-strong w-full max-w-sm rounded-[28px] p-6">
          <Image
            src="/logo-kings-bakamuna.png"
            alt=""
            width={88}
            height={88}
            className="mx-auto size-[88px] rounded-[20px] border border-white/20 object-cover"
            unoptimized
            priority
          />
          <h1 className="mt-4 text-[22px] font-bold text-white">
            Add to Home Screen
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60">
            {iosHint
              ? "Tap Share, then Add to Home Screen for one-tap ordering."
              : "Install Kings Bakamuna like an app for faster ordering."}
          </p>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col gap-3">
        {iosHint ? (
          <div className="rounded-[20px] border-2 border-[var(--glass-accent)] bg-[#1A0E08] px-4 py-3 text-left text-[13px] text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <p className="font-semibold">On iPhone / iPad</p>
            <p className="mt-1 text-white/70">
              Tap the Share button, then choose{" "}
              <span className="font-semibold text-[var(--glass-accent)]">
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
            className="glass-cta flex h-12 items-center justify-center rounded-[20px] text-[15px] font-semibold disabled:opacity-70"
          >
            {installing ? "Installing…" : "Download app"}
          </button>
        ) : waitingForPrompt ? (
          <button
            type="button"
            disabled
            className="glass-cta flex h-12 items-center justify-center rounded-[20px] text-[15px] font-semibold opacity-70"
          >
            Preparing download…
          </button>
        ) : (
          <div className="rounded-[20px] border-2 border-[var(--glass-accent)] bg-[#1A0E08] px-4 py-3 text-left text-[13px] text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <p className="font-semibold">Install from your browser</p>
            <p className="mt-1 text-white/70">
              Open the browser menu and choose{" "}
              <span className="font-semibold text-[var(--glass-accent)]">
                Install app
              </span>{" "}
              or{" "}
              <span className="font-semibold text-[var(--glass-accent)]">
                Add to Home Screen
              </span>
              .
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={goToMenu}
          className="glass-panel flex h-12 items-center justify-center rounded-[20px] text-[15px] font-semibold text-white"
        >
          Continue to menu
        </button>
      </div>
    </div>
  );
}
