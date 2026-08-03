"use client";

import { useEffect } from "react";

/**
 * Keeps <meta name="theme-color"> (and related chrome) in sync with
 * admin branding CSS vars so the OS status bar matches the configured theme.
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
      });
    }

    document.documentElement.style.setProperty("--theme-color", color);
    document.body.style.backgroundColor = color;

    const apple = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    if (apple) {
      // Keep translucent over dark chrome; default for light backgrounds
      const hex = color.replace("#", "");
      const full =
        hex.length === 3
          ? hex
              .split("")
              .map((c) => c + c)
              .join("")
          : hex;
      if (full.length === 6) {
        const r = parseInt(full.slice(0, 2), 16) / 255;
        const g = parseInt(full.slice(2, 4), 16) / 255;
        const b = parseInt(full.slice(4, 6), 16) / 255;
        const lin = (c: number) =>
          c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        apple.setAttribute(
          "content",
          lum < 0.45 ? "black-translucent" : "default",
        );
      }
    }
  }, [color]);

  return null;
}
