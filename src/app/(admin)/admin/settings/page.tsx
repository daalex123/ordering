"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RestaurantSettings } from "@/types/database";
import { DEFAULT_BRANDING } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandingSettingsForm } from "@/components/admin/branding-settings-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";

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
      <div className="space-y-4">
        <AdminPageHeader
          title="Restaurant settings"
          description="Store details, branding, hours, and delivery"
        />
        <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        title="Restaurant settings"
        description="Store details, branding, hours, and delivery"
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant={settings.is_open ? "default" : "secondary"}>
              {settings.is_open ? "Open now" : "Closed"}
            </Badge>
            <Badge variant={settings.delivery_enabled ? "secondary" : "outline"}>
              {settings.delivery_enabled ? "Delivery on" : "Pickup only"}
            </Badge>
          </div>
        }
      />

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

      <form
        onSubmit={save}
        className="admin-panel space-y-5 rounded-xl p-5"
      >
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Store details</h2>
            <p className="text-xs text-muted-foreground">
              Contact info and operating status
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
            <Label>ETA text</Label>
            <Input
              value={settings.eta_text ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, eta_text: e.target.value })
              }
              placeholder="25–35 min"
            />
          </div>
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

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Delivery</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-6">
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
          </div>
        </div>

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
