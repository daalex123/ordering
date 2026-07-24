"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { RestaurantSettings } from "@/types/database";
import { DEFAULT_BRANDING } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandingSettingsForm } from "@/components/admin/branding-settings-form";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [hoursText, setHoursText] = useState("{}");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase
        .from("restaurant_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) {
        const s = data as RestaurantSettings;
        setSettings(s);
        setHoursText(JSON.stringify(s.hours ?? {}, null, 2));
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    let hours: Record<string, string> = {};
    try {
      hours = JSON.parse(hoursText) as Record<string, string>;
    } catch {
      toast.error("Hours must be valid JSON");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurant_settings")
      .update({
        name: settings.name,
        phone: settings.phone,
        address: settings.address,
        is_open: settings.is_open,
        hours,
        delivery_enabled: settings.delivery_enabled,
        delivery_fee: Number(settings.delivery_fee),
        min_order: Number(settings.min_order),
        eta_text: settings.eta_text,
      })
      .eq("id", settings.id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Settings saved");
  }

  if (!settings) {
    return (
      <p className="text-sm text-muted-foreground">Loading settings...</p>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Restaurant settings</h1>
        <p className="text-sm text-muted-foreground">
          Store details, branding, hours, and delivery
        </p>
      </div>

      <BrandingSettingsForm
        settingsId={settings.id}
        initial={{
          logo_url: settings.logo_url,
          favicon_url: settings.favicon_url,
          tagline: settings.tagline,
          primary_color: settings.primary_color || DEFAULT_BRANDING.primary_color,
          primary_foreground:
            settings.primary_foreground || DEFAULT_BRANDING.primary_foreground,
          accent_color: settings.accent_color || DEFAULT_BRANDING.accent_color,
          background_color:
            settings.background_color || DEFAULT_BRANDING.background_color,
          surface_color:
            settings.surface_color || DEFAULT_BRANDING.surface_color,
        }}
        onSaved={(next) => setSettings({ ...settings, ...next })}
      />

      <form onSubmit={save} className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Store details</h2>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={settings.phone ?? ""}
            onChange={(e) =>
              setSettings({ ...settings, phone: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input
            value={settings.address ?? ""}
            onChange={(e) =>
              setSettings({ ...settings, address: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>ETA text</Label>
          <Input
            value={settings.eta_text ?? ""}
            onChange={(e) =>
              setSettings({ ...settings, eta_text: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Delivery fee</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={settings.delivery_fee}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  delivery_fee: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Min order</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={settings.min_order}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  min_order: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.is_open}
            onChange={(e) =>
              setSettings({ ...settings, is_open: e.target.checked })
            }
          />
          Restaurant is open
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.delivery_enabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                delivery_enabled: e.target.checked,
              })
            }
          />
          Delivery enabled
        </label>
        <div className="space-y-2">
          <Label>Hours (JSON)</Label>
          <Textarea
            rows={8}
            value={hoursText}
            onChange={(e) => setHoursText(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save store details"}
        </Button>
      </form>
    </div>
  );
}
