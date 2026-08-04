"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-store";
import {
  formatMoney,
  type FulfillmentType,
  type PaymentMethod,
  type RestaurantSettings,
} from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";
import { notifyOrderSms } from "@/lib/notify-order-sms";
import { cn } from "@/lib/utils";

const glassField =
  "rounded-[20px] border border-white/15 bg-white/8 text-white placeholder:text-white/35 focus-visible:ring-[var(--glass-accent)]";

type Step = "form" | "otp";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("pickup");
  const [payment, setPayment] = useState<PaymentMethod>("pay_at_pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const sendingRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const [{ data: settingsData }, { data: userData }] = await Promise.all([
        supabase.from("restaurant_settings").select("*").limit(1).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (settingsData) setSettings(settingsData as RestaurantSettings);
      if (userData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (profile) {
          setName(profile.full_name ?? "");
          setPhone(profile.phone ?? "");
          const addr = profile.default_address as {
            line1?: string;
            line2?: string;
            city?: string;
          } | null;
          if (addr) {
            setLine1(addr.line1 ?? "");
            setLine2(addr.line2 ?? "");
            setCity(addr.city ?? "");
          }
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (fulfillment === "delivery") setPayment("cod");
    else setPayment("pay_at_pickup");
  }, [fulfillment]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  if (items.length === 0 && step === "form") {
    return (
      <div className="px-5 pb-6">
        <CustomerPageHeader title="Checkout" backHref="/cart" className="px-0" />
        <div className="glass-panel-strong rounded-[28px] px-5 py-16 text-center">
          <p className="text-[18px] font-semibold text-white">Cart is empty</p>
          <button
            type="button"
            className="glass-cta mt-5 inline-flex h-12 items-center rounded-[20px] px-8 text-[15px] font-semibold"
            onClick={() => router.push("/")}
          >
            Browse menu
          </button>
        </div>
      </div>
    );
  }

  const cartSubtotal = subtotal();
  const deliveryFee =
    fulfillment === "delivery" ? Number(settings?.delivery_fee ?? 0) : 0;
  const total = cartSubtotal + deliveryFee;
  const minOrder = Number(settings?.min_order ?? 0);

  function validateCheckout(): boolean {
    if (!settings?.is_open) {
      toast.error("Restaurant is currently closed");
      return false;
    }
    if (items.length === 0) {
      toast.error("Cart is empty");
      return false;
    }
    if (cartSubtotal < minOrder) {
      toast.error(`Minimum order is ${formatMoney(minOrder)}`);
      return false;
    }
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (fulfillment === "delivery") {
      if (!settings?.delivery_enabled) {
        toast.error("Delivery is not available");
        return false;
      }
      if (!line1.trim() || !city.trim()) {
        toast.error("Delivery address is required");
        return false;
      }
    }
    return true;
  }

  async function sendOrderOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (sendingRef.current || loading || resendIn > 0) return;
    if (!validateCheckout()) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth?next=/checkout");
      return;
    }

    sendingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/otp/send", {
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
      setOtp("");
      setResendIn(data.resendAfterSec ?? 30);
      toast.success(`Code sent to ${data.masked || phone}`);
    } catch {
      toast.error("Could not send code. Try again.");
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  async function verifyOrderOtp(e: React.FormEvent) {
    e.preventDefault();
    if (loading || otp.length !== 6) return;
    if (!validateCheckout()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/orders/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: otp,
          fulfillment,
          payment,
          name,
          line1,
          line2,
          city,
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            portionId: item.portionId ?? null,
            portionName: item.portionName ?? null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        orderId?: string;
      };
      if (!res.ok || !data.orderId) {
        toast.error(data.error || "Could not place order");
        return;
      }

      clear();
      notifyOrderSms(data.orderId, "placed");
      toast.success("Order placed!");
      router.push(`/orders/${data.orderId}`);
    } catch {
      toast.error("Could not place order. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 pb-6">
      <CustomerPageHeader title="Checkout" backHref="/cart" className="px-0" />
      <div className="glass-panel-strong space-y-5 rounded-[28px] px-4 pt-5 pb-5">
        {step === "form" ? (
          <form onSubmit={sendOrderOtp} className="space-y-5">
            <div className="space-y-2.5">
              <Label className="text-[13px] font-medium text-white/70">
                Fulfillment
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["pickup", "Pickup"],
                    ...(settings?.delivery_enabled
                      ? ([["delivery", "Delivery"]] as const)
                      : []),
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFulfillment(value)}
                    className={cn(
                      "rounded-[20px] py-3 text-[14px] font-semibold transition",
                      fulfillment === value
                        ? "bg-[var(--glass-accent)] text-white shadow-[0_6px_16px_rgba(255,138,0,0.35)]"
                        : "glass-panel text-white/75",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={glassField}
                />
              </Field>
              <Field label="Phone *">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className={glassField}
                />
              </Field>
            </div>

            {fulfillment === "delivery" ? (
              <div className="glass-panel grid gap-3 rounded-[20px] p-4">
                <Field label="Address line 1 *">
                  <Input
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    required
                    className={glassField}
                  />
                </Field>
                <Field label="Address line 2">
                  <Input
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className={glassField}
                  />
                </Field>
                <Field label="City *">
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className={glassField}
                  />
                </Field>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-white/70">
                Payment
              </Label>
              <Select
                value={payment}
                onValueChange={(v) => {
                  if (v) setPayment(v as PaymentMethod);
                }}
              >
                <SelectTrigger className={cn(glassField, "h-11")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fulfillment === "delivery" ? (
                    <SelectItem value="cod">Cash on delivery</SelectItem>
                  ) : (
                    <SelectItem value="pay_at_pickup">Pay at pickup</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Field label="Order notes">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={glassField}
              />
            </Field>

            <OrderTotals
              cartSubtotal={cartSubtotal}
              deliveryFee={deliveryFee}
              total={total}
            />

            <button
              type="submit"
              disabled={loading || resendIn > 0}
              className="glass-cta w-full rounded-[20px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
            >
              {loading
                ? "Sending code..."
                : resendIn > 0
                  ? `Wait ${resendIn}s`
                  : "Send verification code"}
            </button>
            <p className="text-center text-[12px] text-white/45">
              We&apos;ll SMS a code to confirm your order
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOrderOtp} className="space-y-5">
            <div className="space-y-1 text-center">
              <p className="text-[16px] font-semibold text-white">
                Confirm your order
              </p>
              <p className="text-[13px] text-white/60">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-white/85">{maskedPhone}</span>
              </p>
            </div>

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
                  "h-12 text-center text-[18px] tracking-[0.4em]",
                )}
              />
            </Field>

            <OrderTotals
              cartSubtotal={cartSubtotal}
              deliveryFee={deliveryFee}
              total={total}
            />

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="glass-cta w-full rounded-[20px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
            >
              {loading ? "Placing order..." : "Verify & place order"}
            </button>
            <button
              type="button"
              className="w-full text-[13px] font-semibold text-[var(--glass-accent)] disabled:opacity-50"
              disabled={loading || resendIn > 0}
              onClick={() => void sendOrderOtp()}
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
        )}
      </div>
    </div>
  );
}

function OrderTotals({
  cartSubtotal,
  deliveryFee,
  total,
}: {
  cartSubtotal: number;
  deliveryFee: number;
  total: number;
}) {
  return (
    <div className="glass-panel space-y-2 rounded-[20px] p-4 text-[14px] text-white/80">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatMoney(cartSubtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Delivery</span>
        <span>{formatMoney(deliveryFee)}</span>
      </div>
      <div className="flex justify-between border-t border-dashed border-white/20 pt-2 text-[16px] font-bold text-white">
        <span>Total</span>
        <span className="text-[var(--glass-accent)]">{formatMoney(total)}</span>
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
