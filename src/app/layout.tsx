import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SerwistProvider } from "@serwist/next/react";
import { BrandingProvider } from "@/components/branding-provider";
import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import type { RestaurantSettings } from "@/types/database";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  const icon = branding.favicon_url || branding.logo_url;
  return {
    title: {
      default: branding.name,
      template: `%s · ${branding.name}`,
    },
    description: branding.tagline,
    applicationName: branding.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: branding.name,
    },
    icons: icon
      ? {
          icon: [{ url: icon }],
          apple: [{ url: icon }],
        }
      : {
          icon: [
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
          apple: [{ url: "/icons/icon-192.png" }],
        },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await loadBranding();
  return {
    themeColor: branding.primary_color,
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SerwistProvider swUrl="/sw.js">
          <BrandingProvider>
            {children}
            <Toaster richColors position="top-center" />
          </BrandingProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
