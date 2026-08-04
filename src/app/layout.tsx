import type { Metadata, Viewport } from "next";
import { League_Spartan, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SerwistProvider } from "@serwist/next/react";
import { BrandingProvider } from "@/components/branding-provider";
import { InstallPrompt } from "@/components/customer/install-prompt";
import { DevSwRegister } from "@/components/customer/dev-sw-register";
import { PwaLaunchHandler } from "@/components/pwa-launch-handler";
import { createClient } from "@/lib/supabase/server";
import {
  appleStatusBarStyle,
  chromeIsDark,
  chromeThemeColor,
  getBranding,
} from "@/lib/branding";
import { ThemeColorSync } from "@/components/theme-color-sync";
import type { RestaurantSettings } from "@/types/database";
import "./globals.css";

const leagueSpartan = League_Spartan({
  variable: "--font-league-spartan",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function loadBranding() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("restaurant_settings")
      .select(
        "name, logo_url, favicon_url, tagline, primary_color, primary_foreground, accent_color, background_color, surface_color",
      )
      .limit(1)
      .maybeSingle();
    return getBranding(data as Partial<RestaurantSettings> | null);
  } catch {
    return getBranding(null);
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await loadBranding();
  const chrome = chromeThemeColor(branding);
  // Favicon / PWA home-screen icons use the Kings Bakamuna logo
  // (`public/logo-kings-bakamuna.png` → `public/icons/icon-*.png` + manifest).
  const icon = branding.favicon_url || branding.logo_url;
  return {
    title: {
      default: branding.name,
      template: `%s · ${branding.name}`,
    },
    description: branding.tagline,
    applicationName: branding.name,
    appleWebApp: {
      capable: true,
      statusBarStyle: appleStatusBarStyle(chrome),
      title: branding.name,
    },
    other: {
      "theme-color": chrome,
    },
    icons: icon
      ? {
          icon: [
            { url: icon },
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
          apple: [{ url: "/icons/apple-touch-icon.png" }, { url: icon }],
        }
      : {
          icon: [
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
          apple: [{ url: "/icons/apple-touch-icon.png" }],
        },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await loadBranding();
  const theme = chromeThemeColor(branding);
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: theme },
      { media: "(prefers-color-scheme: dark)", color: theme },
    ],
    colorScheme: chromeIsDark(theme) ? "dark" : "light",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await loadBranding();
  const chrome = chromeThemeColor(branding);

  return (
    <html
      lang="en"
      className={`${leagueSpartan.variable} ${geistMono.variable} h-full antialiased`}
      style={{ backgroundColor: chrome }}
    >
      <body
        className={`flex min-h-full flex-col font-sans ${chromeIsDark(chrome) ? "text-white" : "text-neutral-900"}`}
        style={{ backgroundColor: chrome }}
      >
        <ThemeColorSync color={chrome} />
        <SerwistProvider
          swUrl="/sw.js"
          disable={process.env.NODE_ENV === "development"}
          // Built sw.js is a classic IIFE — module registration fails silently.
          options={{ type: "classic" }}
        >
          <BrandingProvider>
            {process.env.NODE_ENV === "development" ? <DevSwRegister /> : null}
            <PwaLaunchHandler />
            {children}
            <InstallPrompt />
            <Toaster richColors position="top-center" />
          </BrandingProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
