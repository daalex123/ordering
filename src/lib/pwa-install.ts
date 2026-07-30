"use client";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Listener = (event: BeforeInstallPromptEvent | null) => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listening = false;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener(deferredPrompt);
  }
}

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/** Keep a single deferred install event for welcome + banner. */
export function subscribeDeferredInstallPrompt(listener: Listener) {
  ensureListening();
  listener(deferredPrompt);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeferredInstallPrompt() {
  ensureListening();
  return deferredPrompt;
}

export function consumeDeferredInstallPrompt() {
  ensureListening();
  const event = deferredPrompt;
  deferredPrompt = null;
  notify();
  return event;
}
