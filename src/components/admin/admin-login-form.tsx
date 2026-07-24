"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeAdminNext(raw: string | null): string {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/auth") ||
    raw === "/admin/login"
  ) {
    return "/admin";
  }
  if (!raw.startsWith("/admin")) return "/admin";
  return raw.split("?")[0] || "/admin";
}

export function AdminLoginForm({
  restaurantName,
}: {
  restaurantName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAdminNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Clear a customer session so staff can sign in with work credentials
  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && ["admin", "staff"].includes(profile.role)) {
        router.replace(next);
        return;
      }
      await supabase.auth.signOut();
    })();
  }, [next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !authData.user) {
      setLoading(false);
      toast.error(error?.message || "Could not sign in");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !["admin", "staff"].includes(profile.role)
    ) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account doesn’t have admin access");
      return;
    }

    toast.success("Welcome to the ops console");
    window.location.assign(next);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#2a120f_0%,#4a1f18_42%,#e95322_120%)] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl">
        <div className="border-b bg-[#2a120f] px-6 py-7 text-[#fff4ee]">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Store className="size-6 text-[#f5cb58]" />
          </div>
          <p className="text-xs font-semibold tracking-[0.16em] text-white/55 uppercase">
            Staff access
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight">
            {restaurantName}
          </h1>
          <p className="mt-1 text-sm text-white/65">
            Sign in to the admin ops console
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Work email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-11"
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
            <Lock className="size-4" />
            {loading ? "Signing in…" : "Sign in to admin"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Customer ordering?{" "}
            <Link href="/auth" className="font-semibold text-primary">
              Use customer login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
