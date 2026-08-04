"use client";

import { useEffect } from "react";
import { appleStatusBarStyle } from "@/lib/branding";

/**
 * Keeps <meta name="theme-color"> (and related chrome) in sync with
 * admin Background so the OS status bar matches branding.
 */
export function ThemeColorSync({ color }: { color: string }) {
  useEffect(() => {
    if (!color) return;

    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length === 0) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
    } else {
      metas.forEach((el) => {
        el.setAttribute("content", color);
        el.removeAttribute("media");
      });
    }

    document.documentElement.style.setProperty("--theme-color", color);
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;

    const apple = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    if (apple) {
      apple.setAttribute("content", appleStatusBarStyle(color));
    }
  }, [color]);

  return null;
}
