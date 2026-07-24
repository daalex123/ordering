"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";
import { cn } from "@/lib/utils";

function safeNextPath(raw: string | null): string {
  // Only allow same-origin relative paths (blocks //evil.com open redirects).
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/auth")) {
    return "/";
  }
  // Profile is just the login entry point — land on home after auth.
  if (raw === "/profile" || raw.startsWith("/profile/")) {
    return "/";
  }
  return raw;
}

export default function AuthForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const initialMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function goAfterAuth(path: string) {
    try {
      window.localStorage.setItem("kb_onboarded", "1");
    } catch {
      /* ignore */
    }
    // Hard navigation so the session cookie is present on the next document request.
    window.location.assign(path);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    goAfterAuth(next);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    toast.success("Account created — you can order now");
    goAfterAuth(next);
  }

  return (
    <div>
      <CustomerPageHeader
        title={mode === "signin" ? "Log In" : "Sign Up"}
        backHref="/"
      />
      <div className="-mt-4 rounded-t-[30px] bg-white px-6 pt-7 pb-10">
        <div className="mb-6 space-y-2">
          <h2 className="text-[28px] font-bold text-[var(--yum-ink)]">
            {mode === "signin" ? "Welcome" : "Create account"}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {mode === "signin"
              ? "Sign in to track orders and save your delivery details."
              : "Join us to place orders and get live updates."}
          </p>
        </div>

        <form
          onSubmit={mode === "signin" ? signIn : signUp}
          className="space-y-4"
        >
          {mode === "signup" ? (
            <div className="space-y-2">
              <Label className="font-semibold text-[var(--yum-ink)]">
                Full name
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12 rounded-2xl border-0 bg-[var(--yum-cream)]"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label className="font-semibold text-[var(--yum-ink)]">
              Email or Mobile Number
            </Label>
            <Input
              type="email"
              required
              placeholder="example@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl border-0 bg-[var(--yum-cream)]"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-[var(--yum-ink)]">
              Password
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-2xl border-0 bg-[var(--yum-cream)] pr-12"
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-primary"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-primary py-3.5 text-base font-semibold text-white disabled:opacity-60"
          >
            {loading
              ? mode === "signin"
                ? "Signing in..."
                : "Creating..."
              : mode === "signin"
                ? "Log In"
                : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--yum-ink)]">
          {mode === "signin" ? "Don't have an account? " : "Already registered? "}
          <button
            type="button"
            className={cn("font-bold text-primary")}
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
}
