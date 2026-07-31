"use client";

import { useEffect, useState } from "react";
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

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("pickup");
  const [payment, setPayment] = useState<PaymentMethod>("pay_at_pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

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

  if (items.length === 0) {
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

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!settings?.is_open) {
      toast.error("Restaurant is currently closed");
      return;
    }
    if (cartSubtotal < minOrder) {
      toast.error(`Minimum order is ${formatMoney(minOrder)}`);
      return;
    }
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (fulfillment === "delivery") {
      if (!settings?.delivery_enabled) {
        toast.error("Delivery is not available");
        return;
      }
      if (!line1.trim() || !city.trim()) {
        toast.error("Delivery address is required");
        return;
      }
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push("/auth?next=/checkout");
      return;
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        fulfillment_type: fulfillment,
        delivery_address:
          fulfillment === "delivery"
            ? { line1, line2: line2 || undefined, city }
            : null,
        customer_phone: phone.trim(),
        customer_name: name.trim() || null,
        payment_method: payment,
        subtotal: cartSubtotal,
        delivery_fee: deliveryFee,
        total,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (error || !order) {
      setLoading(false);
      toast.error(error?.message ?? "Could not place order");
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        portion_name: item.portionName || null,
        unit_price: item.price,
        quantity: item.quantity,
        notes: item.notes || null,
      })),
    );

    if (itemsError) {
      setLoading(false);
      toast.error(itemsError.message);
      return;
    }

    await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || null,
        phone: phone.trim(),
        default_address:
          fulfillment === "delivery"
            ? { line1, line2: line2 || undefined, city }
            : undefined,
      })
      .eq("id", user.id);

    clear();
    notifyOrderSms(order.id, "placed");
    setLoading(false);
    toast.success("Order placed!");
    router.push(`/orders/${order.id}`);
  }

  return (
    <div className="px-5 pb-6">
      <CustomerPageHeader title="Checkout" backHref="/cart" className="px-0" />
      <form
        onSubmit={placeOrder}
        className="glass-panel-strong space-y-5 rounded-[28px] px-4 pt-5 pb-5"
      >
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
            <span className="text-[var(--glass-accent)]">
              {formatMoney(total)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="glass-cta w-full rounded-[20px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
        >
          {loading ? "Placing order..." : "Place order"}
        </button>
      </form>
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
