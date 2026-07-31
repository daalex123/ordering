"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClipboardList,
  HelpCircle,
  LogOut,
  MapPin,
  Settings,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";
import { cn } from "@/lib/utils";

const glassField =
  "rounded-[20px] border border-white/15 bg-white/8 text-white placeholder:text-white/35";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth?next=/profile");
        return;
      }
      setEmail(user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
        setLine1(p.default_address?.line1 ?? "");
        setLine2(p.default_address?.line2 ?? "");
        setCity(p.default_address?.city ?? "");
      }
      setLoading(false);
    })();
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        default_address: {
          line1,
          line2: line2 || undefined,
          city,
        },
      })
      .eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    setEditing(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <p className="py-16 text-center text-[14px] text-white/50">Loading...</p>
    );
  }

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || email.slice(0, 1).toUpperCase();

  return (
    <div className="px-5 pb-6">
      <CustomerPageHeader title="Profile" className="px-0" />

      <div className="glass-panel-strong space-y-5 rounded-[28px] px-4 pt-5 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-[var(--glass-accent)] text-[20px] font-bold text-white">
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[20px] font-bold text-white">
              {fullName || "Your profile"}
            </p>
            <p className="truncate text-[13px] text-white/55">{email}</p>
          </div>
        </div>

        <div className="h-px bg-white/15" />

        <nav className="space-y-0">
          <MenuLink href="/orders" icon={ClipboardList} label="My Orders" />
          <MenuButton
            icon={User}
            label="My Profile"
            onClick={() => setEditing((v) => !v)}
          />
          <MenuButton
            icon={MapPin}
            label="Delivery Address"
            onClick={() => setEditing(true)}
          />
          {profile && ["admin", "staff"].includes(profile.role) ? (
            <MenuLink href="/admin" icon={Settings} label="Restaurant Admin" />
          ) : null}
          <MenuLink href="/auth" icon={HelpCircle} label="Help & FAQs" />
          <MenuButton icon={LogOut} label="Log Out" onClick={signOut} last />
        </nav>

        {editing ? (
          <form
            onSubmit={save}
            className="glass-panel space-y-3 rounded-[20px] p-4"
          >
            <p className="text-[15px] font-bold text-white">Edit profile</p>
            <div className="space-y-2">
              <Label className="text-[13px] text-white/70">Email</Label>
              <Input
                value={email}
                disabled
                className={cn(glassField, "opacity-60")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-[13px] text-white/70">
                Full name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={glassField}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[13px] text-white/70">
                Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={glassField}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] text-white/70">Default address</Label>
              <Input
                placeholder="Street address"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className={glassField}
              />
              <Input
                placeholder="Apt / landmark"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className={glassField}
              />
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={glassField}
              />
            </div>
            <button
              type="submit"
              className="glass-cta w-full rounded-[20px] py-3 text-[15px] font-semibold"
            >
              Save profile
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-white/15 py-3.5"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white">
        <Icon className="size-5" />
      </span>
      <span className="text-[15px] font-medium text-white/85">{label}</span>
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 py-3.5 text-left",
        !last && "border-b border-white/15",
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white">
        <Icon className="size-5" />
      </span>
      <span className="text-[15px] font-medium text-white/85">{label}</span>
    </button>
  );
}
