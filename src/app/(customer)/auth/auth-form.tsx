"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";
import { cn } from "@/lib/utils";

const glassField =
  "h-12 rounded-[20px] border border-white/15 bg-white/8 text-white placeholder:text-white/35 focus-visible:ring-[var(--glass-accent)]";

function safeNextPath(raw: string | null): string {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/auth")
  ) {
    return "/";
  }
  if (raw === "/profile" || raw.startsWith("/profile/")) {
    return "/";
  }
  return raw;
}

type Step = "form" | "otp";

export default function AuthForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const initialMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [step, setStep] = useState<Step>("form");

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

  function resetToSignIn() {
    setMode("signin");
    setStep("form");
    setOtp("");
    setResendIn(0);
  }

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (sendingRef.current || loading || resendIn > 0) return;

    if (!fullName.trim()) {
      toast.error("Enter your full name");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your email");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!phone.trim()) {
      toast.error("Enter your mobile number");
      return;
    }

    sendingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "signup" }),
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
      toast.success(
        `Code sent to ${data.masked || data.sentTo || "your phone"}`,
      );
    } catch {
      toast.error("Could not send code");
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  async function verifyOtpAndRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: otp,
          fullName,
          email,
          password,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        email?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email || email,
        password,
      });
      if (error) {
        toast.error(error.message);
        resetToSignIn();
        return;
      }

      toast.success("Account created — welcome!");
      goAfterAuth(next);
    } catch {
      toast.error("Verification failed");
    } finally {
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

  const title =
    mode === "signup" && step === "otp"
      ? "Enter code"
      : mode === "signin"
        ? "Log In"
        : "Sign Up";

  return (
    <div className="px-5 pb-8">
      <CustomerPageHeader title={title} backHref="/" className="px-0" />

      <div className="glass-panel-strong relative overflow-hidden rounded-[28px] px-5 pt-6 pb-7">
        <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-[var(--glass-accent)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-36 rounded-full bg-[var(--glass-accent)]/10 blur-3xl" />

        <div className="relative z-10 mb-5 flex flex-col items-center gap-2 text-center">
          <div className="relative size-14 overflow-hidden rounded-[16px] border border-white/20 bg-white/10 shadow-lg">
            <Image
              src="/logo-kings-bakamuna.png"
              alt="Kings Bakamuna"
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>
          <p className="text-[13px] text-white/55">Kings Bakamuna</p>
        </div>

        <div className="relative z-10 mb-6 space-y-1.5">
          <h2 className="text-[24px] font-bold text-white">
            {mode === "signup" && step === "otp"
              ? "Verify number"
              : mode === "signin"
                ? "Welcome"
                : "Create account"}
          </h2>
          <p className="text-[13px] leading-relaxed text-white/55">
            {mode === "signup" && step === "otp"
              ? `We sent a 6-digit code to ${maskedPhone}.`
              : mode === "signin"
                ? "Sign in with email and password."
                : "Create an account, then verify your mobile number."}
          </p>
        </div>

        {mode === "signin" ? (
          <form onSubmit={signInEmail} className="relative z-10 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                required
                placeholder="example@example.com"
                value={email}
                onValueChange={setEmail}
                className={glassField}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onValueChange={setPassword}
                  className={cn(glassField, "pr-14")}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[12px] font-semibold text-[var(--glass-accent)]"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="glass-cta mt-2 w-full rounded-[20px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Log In"}
            </button>
          </form>
        ) : null}

        {mode === "signup" && step === "form" ? (
          <form onSubmit={sendOtp} className="relative z-10 space-y-4">
            <Field label="Full name">
              <Input
                required
                value={fullName}
                onValueChange={setFullName}
                className={glassField}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                required
                placeholder="example@example.com"
                value={email}
                onValueChange={setEmail}
                className={glassField}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onValueChange={setPassword}
                  className={cn(glassField, "pr-14")}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[12px] font-semibold text-[var(--glass-accent)]"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <Field label="Mobile number">
              <Input
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="07XXXXXXXX"
                value={phone}
                onValueChange={setPhone}
                className={glassField}
              />
            </Field>
            <button
              type="submit"
              disabled={loading || resendIn > 0}
              className="glass-cta mt-2 w-full rounded-[20px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
            >
              {loading
                ? "Sending code..."
                : resendIn > 0
                  ? `Wait ${resendIn}s`
                  : "Send verification code"}
            </button>
          </form>
        ) : null}

        {mode === "signup" && step === "otp" ? (
          <form
            onSubmit={verifyOtpAndRegister}
            className="relative z-10 space-y-4"
          >
            <Field label="Verification code">
              <Input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onValueChange={(value) =>
                  setOtp(value.replace(/\D/g, "").slice(0, 6))
                }
                className={cn(
                  glassField,
                  "text-center text-[18px] tracking-[0.4em]",
                )}
              />
            </Field>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="glass-cta mt-2 w-full rounded-[20px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Verify & create account"}
            </button>
            <button
              type="button"
              className="w-full text-[13px] font-semibold text-[var(--glass-accent)] disabled:opacity-50"
              disabled={loading || resendIn > 0}
              onClick={() => void sendOtp()}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <button
              type="button"
              className="w-full text-[13px] font-medium text-white/45"
              disabled={loading}
              onClick={() => {
                setOtp("");
                setStep("form");
              }}
            >
              Edit details
            </button>
          </form>
        ) : null}

        <p className="relative z-10 mt-6 text-center text-[13px] text-white/70">
          {mode === "signin"
            ? "Don't have an account? "
            : "Already registered? "}
          <button
            type="button"
            className="font-bold text-[var(--glass-accent)]"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setStep("form");
              setOtp("");
              setResendIn(0);
            }}
          >
            {mode === "signin" ? "Sign Up" : "Log In"}
          </button>
        </p>
        {/* <p className="relative z-10 mt-3 text-center text-[12px] text-white/40">
          Restaurant staff?{" "}
          <a
            href="/admin/login"
            className="font-semibold text-[var(--glass-accent)]"
          >
            Admin login
          </a>
        </p> */}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-medium text-white/70">{label}</Label>
      {children}
    </div>
  );
}
