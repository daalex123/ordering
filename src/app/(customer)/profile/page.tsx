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
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading...
      </p>
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
    <div>
      <CustomerPageHeader title="Profile" />
      <div className="-mt-4 space-y-5 rounded-t-[30px] bg-primary px-5 pt-6 pb-10 text-white">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-white text-xl font-bold text-primary">
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold">
              {fullName || "Your profile"}
            </p>
            <p className="truncate text-sm text-[var(--yum-cream)]">{email}</p>
          </div>
        </div>

        <div className="h-px bg-white/30" />

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
            className="space-y-3 rounded-[24px] bg-white p-4 text-[var(--yum-ink)]"
          >
            <p className="font-bold">Edit profile</p>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="rounded-2xl bg-[var(--yum-sheet)]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-2xl border-0 bg-[var(--yum-cream)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-2xl border-0 bg-[var(--yum-cream)]"
              />
            </div>
            <div className="space-y-2">
              <Label>Default address</Label>
              <Input
                placeholder="Street address"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="rounded-2xl border-0 bg-[var(--yum-cream)]"
              />
              <Input
                placeholder="Apt / landmark"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="rounded-2xl border-0 bg-[var(--yum-cream)]"
              />
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-2xl border-0 bg-[var(--yum-cream)]"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-primary py-3 font-semibold text-white"
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
      className="flex items-center gap-3 border-b border-white/25 py-3.5"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white">
        <Icon className="size-5 text-primary" />
      </span>
      <span className="font-medium text-[var(--yum-cream)]">{label}</span>
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
        !last && "border-b border-white/25",
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white">
        <Icon className="size-5 text-primary" />
      </span>
      <span className="font-medium text-[var(--yum-cream)]">{label}</span>
    </button>
  );
}
