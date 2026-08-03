import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { chromeThemeColor, getBranding } from "@/lib/branding";
import type { RestaurantSettings } from "@/types/database";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let branding = getBranding(null);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("restaurant_settings")
      .select(
        "name, logo_url, favicon_url, tagline, primary_color, primary_foreground, accent_color, background_color, surface_color",
      )
      .limit(1)
      .maybeSingle();
    branding = getBranding(data as Partial<RestaurantSettings> | null);
  } catch {
    /* use defaults */
  }

  const theme = chromeThemeColor(branding);

  return {
    id: "/",
    name: branding.name,
    short_name: branding.name.split(/\s+/)[0] || "Order",
    description: branding.tagline,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: theme,
    theme_color: theme,
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
