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
    // Keep kit yellow as the header accent; primary brand color drives CTAs/nav.
    ["--yum-peach" as string]: branding.surface_color,
  };
}

export function isValidHexColor(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}
