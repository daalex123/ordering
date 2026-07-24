import { createClient } from "@/lib/supabase/server";
import { getBranding, brandingStyleVars } from "@/lib/branding";
import type { RestaurantSettings } from "@/types/database";

export async function BrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurant_settings")
    .select(
      "name, logo_url, favicon_url, tagline, primary_color, primary_foreground, accent_color, background_color, surface_color",
    )
    .limit(1)
    .maybeSingle();

  const branding = getBranding(data as Partial<RestaurantSettings> | null);

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={brandingStyleVars(branding)}
      data-brand={branding.name}
    >
      {children}
    </div>
  );
}
