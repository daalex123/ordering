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
import { Button } from "@/components/ui/button";
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
      <div className="py-16 text-center">
        <p className="font-medium">Cart is empty</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Browse menu
        </Button>
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
    setLoading(false);
    toast.success("Order placed!");
    router.push(`/orders/${order.id}`);
  }

  return (
    <form onSubmit={placeOrder} className="space-y-5">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="space-y-2">
        <Label>Fulfillment</Label>
        <Select
          value={fulfillment}
          onValueChange={(v) => {
            if (v) setFulfillment(v as FulfillmentType);
          }}
        >
          <SelectTrigger>
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
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
      </div>

      {fulfillment === "delivery" ? (
        <div className="grid gap-3 rounded-xl border p-3">
          <div className="space-y-2">
            <Label htmlFor="line1">Address line 1 *</Label>
            <Input
              id="line1"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="line2">Address line 2</Label>
            <Input
              id="line2"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Payment</Label>
        <Select
          value={payment}
          onValueChange={(v) => {
            if (v) setPayment(v as PaymentMethod);
          }}
        >
          <SelectTrigger>
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

      <div className="space-y-2">
        <Label htmlFor="notes">Order notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-1 rounded-xl border p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(cartSubtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery</span>
          <span>{formatMoney(deliveryFee)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Placing order..." : "Place order"}
      </Button>
    </form>
  );
}
