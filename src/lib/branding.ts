import type { CSSProperties } from "react";
import type { RestaurantSettings } from "@/types/database";
import { DEFAULT_BRANDING } from "@/types/database";

export type Branding = {
  name: string;
  logo_url: string | null;
  favicon_url: string | null;
  tagline: string;
  primary_color: string;
  primary_foreground: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
};

export function getBranding(
  settings: Partial<RestaurantSettings> | null | undefined,
): Branding {
  return {
    name: settings?.name?.trim() || DEFAULT_BRANDING.name,
    logo_url: settings?.logo_url ?? DEFAULT_BRANDING.logo_url,
    favicon_url: settings?.favicon_url ?? DEFAULT_BRANDING.favicon_url,
    tagline: settings?.tagline?.trim() || DEFAULT_BRANDING.tagline,
    primary_color: settings?.primary_color || DEFAULT_BRANDING.primary_color,
    primary_foreground:
      settings?.primary_foreground || DEFAULT_BRANDING.primary_foreground,
    accent_color: settings?.accent_color || DEFAULT_BRANDING.accent_color,
    background_color:
      settings?.background_color || DEFAULT_BRANDING.background_color,
    surface_color: settings?.surface_color || DEFAULT_BRANDING.surface_color,
  };
}

/** CSS custom properties applied at runtime from admin branding. */
export function brandingStyleVars(branding: Branding): CSSProperties {
  return {
    ["--primary" as string]: branding.primary_color,
    ["--primary-foreground" as string]: branding.primary_foreground,
    ["--ring" as string]: branding.primary_color,
    ["--sidebar-primary" as string]: branding.primary_color,
    ["--sidebar-primary-foreground" as string]: branding.primary_foreground,
    ["--accent" as string]: branding.surface_color,
    ["--accent-foreground" as string]: branding.primary_color,
    ["--background" as string]: branding.background_color,
    ["--brand-accent" as string]: branding.accent_color,
    ["--brand-surface" as string]: branding.surface_color,
    ["--yum-orange" as string]: branding.primary_color,
    ["--glass-accent" as string]: branding.primary_color,
    // Keep kit yellow as the header accent; primary brand color drives CTAs/nav.
    ["--yum-peach" as string]: branding.surface_color,
  };
}

export function isValidHexColor(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function expandHex(hex: string): string {
  const h = hex.trim().replace("#", "");
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return `#${h}`;
}

/** Relative luminance 0–1 for a hex color. */
function hexLuminance(hex: string): number {
  const full = expandHex(hex).slice(1);
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Status bar / PWA chrome color from restaurant branding.
 * Uses `background_color` when it's a valid dark hex; otherwise glass dark.
 * (Skips legacy light backgrounds like #F5F5F5 so the glass UI stays coherent.)
 */
export function chromeThemeColor(branding: Branding): string {
  const bg = branding.background_color?.trim();
  if (bg && isValidHexColor(bg) && hexLuminance(bg) < 0.35) {
    return expandHex(bg);
  }
  return DEFAULT_BRANDING.background_color;
}
