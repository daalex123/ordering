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
      <div>
        <CustomerPageHeader title="Checkout" backHref="/cart" />
        <div className="-mt-4 rounded-t-[30px] bg-white px-5 py-16 text-center">
          <p className="font-medium text-[var(--yum-ink)]">Cart is empty</p>
          <button
            type="button"
            className="mt-4 rounded-full bg-primary px-8 py-3 font-semibold text-white"
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
    <div>
      <CustomerPageHeader title="Checkout" backHref="/cart" />
      <form
        onSubmit={placeOrder}
        className="-mt-4 space-y-5 rounded-t-[30px] bg-white px-5 pt-6 pb-8"
      >
        <div className="space-y-2">
          <Label className="font-semibold text-[var(--yum-ink)]">
            Fulfillment
          </Label>
          <Select
            value={fulfillment}
            onValueChange={(v) => {
              if (v) setFulfillment(v as FulfillmentType);
            }}
          >
            <SelectTrigger className="rounded-2xl border-0 bg-[var(--yum-cream)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pickup">Pickup</SelectItem>
              {settings?.delivery_enabled ? (
                <SelectItem value="delivery">Delivery</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl border-0 bg-[var(--yum-cream)]"
            />
          </Field>
          <Field label="Phone *">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="rounded-2xl border-0 bg-[var(--yum-cream)]"
            />
          </Field>
        </div>

        {fulfillment === "delivery" ? (
          <div className="grid gap-3 rounded-[24px] bg-[var(--yum-peach)]/50 p-4">
            <Field label="Address line 1 *">
              <Input
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                required
                className="rounded-2xl border-0 bg-white"
              />
            </Field>
            <Field label="Address line 2">
              <Input
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="rounded-2xl border-0 bg-white"
              />
            </Field>
            <Field label="City *">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="rounded-2xl border-0 bg-white"
              />
            </Field>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label className="font-semibold text-[var(--yum-ink)]">Payment</Label>
          <Select
            value={payment}
            onValueChange={(v) => {
              if (v) setPayment(v as PaymentMethod);
            }}
          >
            <SelectTrigger className="rounded-2xl border-0 bg-[var(--yum-cream)]">
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
            className="rounded-2xl border-0 bg-[var(--yum-cream)]"
          />
        </Field>

        <div className="space-y-2 rounded-[24px] bg-primary p-4 text-sm text-white">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(cartSubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{formatMoney(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-white/40 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--yum-yellow)] py-3.5 text-base font-semibold text-primary disabled:opacity-60"
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
      <Label className="font-semibold text-[var(--yum-ink)]">{label}</Label>
      {children}
    </div>
  );
}
