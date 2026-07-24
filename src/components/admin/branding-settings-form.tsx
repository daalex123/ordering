"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isValidHexColor } from "@/lib/branding";
import type { RestaurantSettings } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BrandingFields = Pick<
  RestaurantSettings,
  | "logo_url"
  | "favicon_url"
  | "tagline"
  | "primary_color"
  | "primary_foreground"
  | "accent_color"
  | "background_color"
  | "surface_color"
>;

export function BrandingSettingsForm({
  settingsId,
  initial,
  onSaved,
}: {
  settingsId: string;
  initial: BrandingFields;
  onSaved?: (next: BrandingFields) => void;
}) {
  const [form, setForm] = useState<BrandingFields>(initial);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);

  function setField<K extends keyof BrandingFields>(
    key: K,
    value: BrandingFields[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadAsset(kind: "logo" | "favicon", file: File) {
    setUploading(kind);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${kind}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setUploading(null);
      toast.error(uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    if (kind === "logo") setField("logo_url", data.publicUrl);
    else setField("favicon_url", data.publicUrl);
    setUploading(null);
    toast.success(`${kind === "logo" ? "Logo" : "Favicon"} uploaded`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const colors = [
      form.primary_color,
      form.primary_foreground,
      form.accent_color,
      form.background_color,
      form.surface_color,
    ];
    if (colors.some((c) => !isValidHexColor(c))) {
      toast.error("Colors must be valid hex values like #c2410c");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurant_settings")
      .update({
        logo_url: form.logo_url?.trim() || null,
        favicon_url: form.favicon_url?.trim() || null,
        tagline: form.tagline?.trim() || null,
        primary_color: form.primary_color.trim(),
        primary_foreground: form.primary_foreground.trim(),
        accent_color: form.accent_color.trim(),
        background_color: form.background_color.trim(),
        surface_color: form.surface_color.trim(),
      })
      .eq("id", settingsId);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved?.(form);
    toast.success("Branding saved");
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Logo, colors, and tagline shown on the customer app
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {form.logo_url ? (
                <Image
                  src={form.logo_url}
                  alt="Logo preview"
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAsset("logo", file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading === "logo"}
                onClick={() => logoInput.current?.click()}
              >
                {uploading === "logo" ? "Uploading..." : "Upload logo"}
              </Button>
              {form.logo_url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setField("logo_url", null)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          <Input
            placeholder="Or paste logo URL"
            value={form.logo_url ?? ""}
            onChange={(e) => setField("logo_url", e.target.value || null)}
          />
        </div>

        <div className="space-y-2">
          <Label>Favicon</Label>
          <div className="flex items-center gap-3">
            <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {form.favicon_url ? (
                <Image
                  src={form.favicon_url}
                  alt="Favicon preview"
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={faviconInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/x-icon,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAsset("favicon", file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading === "favicon"}
                onClick={() => faviconInput.current?.click()}
              >
                {uploading === "favicon" ? "Uploading..." : "Upload favicon"}
              </Button>
              {form.favicon_url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setField("favicon_url", null)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          <Input
            placeholder="Or paste favicon URL"
            value={form.favicon_url ?? ""}
            onChange={(e) => setField("favicon_url", e.target.value || null)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tagline</Label>
        <Input
          value={form.tagline ?? ""}
          onChange={(e) => setField("tagline", e.target.value || null)}
          placeholder="Fresh food, ready fast"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField
          label="Primary"
          value={form.primary_color}
          onChange={(v) => setField("primary_color", v)}
        />
        <ColorField
          label="Primary text"
          value={form.primary_foreground}
          onChange={(v) => setField("primary_foreground", v)}
        />
        <ColorField
          label="Accent"
          value={form.accent_color}
          onChange={(v) => setField("accent_color", v)}
        />
        <ColorField
          label="Background"
          value={form.background_color}
          onChange={(v) => setField("background_color", v)}
        />
        <ColorField
          label="Surface / chips"
          value={form.surface_color}
          onChange={(v) => setField("surface_color", v)}
        />
      </div>

      <div
        className="rounded-xl border p-4"
        style={{
          background: form.background_color,
          color: "#111",
        }}
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Preview
        </p>
        <div className="flex items-center gap-3">
          {form.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logo_url}
              alt=""
              className="size-10 rounded-md object-contain"
            />
          ) : null}
          <div>
            <p className="font-semibold">Your restaurant</p>
            <p className="text-xs opacity-70">{form.tagline || "Tagline"}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: form.primary_color,
              color: form.primary_foreground,
            }}
          >
            Primary button
          </span>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: form.surface_color, color: form.primary_color }}
          >
            Chip
          </span>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ background: form.accent_color }}
          >
            Accent
          </span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Save branding"}
      </Button>
    </form>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#c2410c"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border bg-transparent p-1"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#c2410c"
          className="font-mono"
        />
      </div>
    </div>
  );
}
