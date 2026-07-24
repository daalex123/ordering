"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";
import { cn } from "@/lib/utils";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/auth")) {
    return "/";
  }
  if (raw === "/profile" || raw.startsWith("/profile/")) {
    return "/";
  }
  return raw;
}

type Method = "phone" | "email";
type Step = "phone" | "otp" | "email";

export default function AuthForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const initialMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [method, setMethod] = useState<Method>("phone");
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [step, setStep] = useState<Step>("phone");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  function goAfterAuth(path: string) {
    try {
      window.localStorage.setItem("kb_onboarded", "1");
    } catch {
      /* ignore */
    }
    window.location.assign(path);
  }

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (sendingRef.current || loading || resendIn > 0) return;
    sendingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as {
        error?: string;
        masked?: string;
        sentTo?: string;
        retryAfterSec?: number;
        resendAfterSec?: number;
      };
      if (!res.ok) {
        if (data.retryAfterSec) setResendIn(data.retryAfterSec);
        toast.error(data.error || "Could not send code");
        return;
      }
      setMaskedPhone(data.masked || data.sentTo || phone);
      setStep("otp");
      setResendIn(data.resendAfterSec ?? 30);
      toast.success(`Code sent to ${data.masked || data.sentTo || "your phone"}`);
    } catch {
      toast.error("Could not send code");
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: otp,
          fullName: mode === "signup" ? fullName : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        token_hash?: string;
      };
      if (!res.ok || !data.token_hash) {
        toast.error(data.error || "Verification failed");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "email",
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(mode === "signup" ? "Welcome!" : "Welcome back");
      goAfterAuth(next);
    } catch {
      toast.error("Verification failed");
      setLoading(false);
    }
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message || "Could not sign in");
      return;
    }

    // Staff accounts should use the admin console login
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile && ["admin", "staff"].includes(profile.role)) {
      toast.success("Welcome back");
      goAfterAuth(next.startsWith("/admin") ? next : "/admin");
      return;
    }

    toast.success("Welcome back");
    goAfterAuth(next);
  }

  async function signUpEmail(e: React.FormEvent) {
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

  const title =
    method === "phone"
      ? step === "otp"
        ? "Enter code"
        : mode === "signin"
          ? "Log In"
          : "Sign Up"
      : mode === "signin"
        ? "Log In"
        : "Sign Up";

  return (
    <div>
      <CustomerPageHeader title={title} backHref="/" />
      <div className="-mt-4 rounded-t-[30px] bg-white px-6 pt-7 pb-10">
        <div className="mb-5 flex rounded-full bg-[var(--yum-cream)] p-1">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-semibold",
              method === "phone"
                ? "bg-primary text-white"
                : "text-[var(--yum-ink)]",
            )}
            onClick={() => {
              setMethod("phone");
              setStep("phone");
            }}
          >
            Mobile OTP
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-semibold",
              method === "email"
                ? "bg-primary text-white"
                : "text-[var(--yum-ink)]",
            )}
            onClick={() => {
              setMethod("email");
              setStep("email");
            }}
          >
            Email
          </button>
        </div>

        <div className="mb-6 space-y-2">
          <h2 className="text-[28px] font-bold text-[var(--yum-ink)]">
            {method === "phone" && step === "otp"
              ? "Verify number"
              : mode === "signin"
                ? "Welcome"
                : "Create account"}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {method === "phone" && step === "otp"
              ? `We sent a 6-digit code to ${maskedPhone}.`
              : method === "phone"
                ? "We'll text you a one-time code to sign in."
                : mode === "signin"
                  ? "Sign in with email and password."
                  : "Create an account with email and password."}
          </p>
        </div>

        {method === "phone" && step === "phone" ? (
          <form onSubmit={sendOtp} className="space-y-4">
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
                Mobile number
              </Label>
              <Input
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="07XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 rounded-2xl border-0 bg-[var(--yum-cream)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || resendIn > 0}
              className="mt-2 w-full rounded-full bg-primary py-3.5 text-base font-semibold text-white disabled:opacity-60"
            >
              {loading
                ? "Sending..."
                : resendIn > 0
                  ? `Wait ${resendIn}s`
                  : "Send code"}
            </button>
          </form>
        ) : null}

        {method === "phone" && step === "otp" ? (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold text-[var(--yum-ink)]">
                Verification code
              </Label>
              <Input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="h-12 rounded-2xl border-0 bg-[var(--yum-cream)] tracking-[0.4em] text-center text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="mt-2 w-full rounded-full bg-primary py-3.5 text-base font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify & continue"}
            </button>
            <button
              type="button"
              className="w-full text-sm font-semibold text-primary disabled:opacity-50"
              disabled={loading || resendIn > 0}
              onClick={() => void sendOtp()}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <button
              type="button"
              className="w-full text-sm font-semibold text-muted-foreground"
              disabled={loading}
              onClick={() => {
                setOtp("");
                setStep("phone");
              }}
            >
              Change number
            </button>
          </form>
        ) : null}

        {method === "email" ? (
          <form
            onSubmit={mode === "signin" ? signInEmail : signUpEmail}
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
              <Label className="font-semibold text-[var(--yum-ink)]">Email</Label>
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
        ) : null}

        <p className="mt-6 text-center text-sm text-[var(--yum-ink)]">
          {mode === "signin" ? "Don't have an account? " : "Already registered? "}
          <button
            type="button"
            className="font-bold text-primary"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setStep(method === "phone" ? "phone" : "email");
              setOtp("");
            }}
          >
            {mode === "signin" ? "Sign Up" : "Log In"}
          </button>
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Restaurant staff?{" "}
          <a href="/admin/login" className="font-semibold text-primary">
            Admin login
          </a>
        </p>
      </div>
    </div>
  );
}
