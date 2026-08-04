import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { verifyAndConsumeOtp } from "@/lib/otp-challenge";
import type {
  FulfillmentType,
  PaymentMethod,
  RestaurantSettings,
} from "@/types/database";

export const runtime = "nodejs";

type OrderItemInput = {
  productId?: string;
  portionId?: string | null;
  portionName?: string | null;
  name?: string;
  price?: number;
  quantity?: number;
  notes?: string | null;
};

type VerifyBody = {
  phone?: string;
  code?: string;
  fulfillment?: FulfillmentType;
  payment?: PaymentMethod;
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  notes?: string;
  items?: OrderItemInput[];
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as VerifyBody;
    const phone = normalizePhone(body.phone ?? "");
    const code = (body.code ?? "").trim();
    const fulfillment = body.fulfillment;
    const payment = body.payment;
    const items = body.items ?? [];
    const customerName = body.name?.trim() || null;
    const orderNotes = body.notes?.trim() || null;

    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid mobile number" },
        { status: 400 },
      );
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter the 6-digit code from your SMS" },
        { status: 400 },
      );
    }
    if (fulfillment !== "pickup" && fulfillment !== "delivery") {
      return NextResponse.json(
        { error: "Invalid fulfillment type" },
        { status: 400 },
      );
    }
    if (payment !== "cod" && payment !== "pay_at_pickup") {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 },
      );
    }
    if (fulfillment === "pickup" && payment !== "pay_at_pickup") {
      return NextResponse.json(
        { error: "Pickup orders must use pay at pickup" },
        { status: 400 },
      );
    }
    if (fulfillment === "delivery" && payment !== "cod") {
      return NextResponse.json(
        { error: "Delivery orders must use cash on delivery" },
        { status: 400 },
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (items.length > 50) {
      return NextResponse.json({ error: "Too many items" }, { status: 400 });
    }

    if (fulfillment === "delivery") {
      if (!body.line1?.trim() || !body.city?.trim()) {
        return NextResponse.json(
          { error: "Delivery address is required" },
          { status: 400 },
        );
      }
    }

    const verified = await verifyAndConsumeOtp({
      phone,
      code,
      purpose: "order",
    });
    if (!verified.ok) {
      return NextResponse.json(
        { error: verified.error },
        { status: verified.status },
      );
    }

    const admin = createAdminClient();
    const { data: settingsRow, error: settingsError } = await admin
      .from("restaurant_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError || !settingsRow) {
      return NextResponse.json(
        { error: "Restaurant settings unavailable" },
        { status: 500 },
      );
    }

    const settings = settingsRow as RestaurantSettings;
    if (!settings.is_open) {
      return NextResponse.json(
        { error: "Restaurant is currently closed" },
        { status: 409 },
      );
    }
    if (fulfillment === "delivery" && !settings.delivery_enabled) {
      return NextResponse.json(
        { error: "Delivery is not available" },
        { status: 409 },
      );
    }

    if (items.some((i) => !i.productId?.trim())) {
      return NextResponse.json(
        { error: "Invalid cart items" },
        { status: 400 },
      );
    }

    const productIds = [
      ...new Set(items.map((i) => i.productId!.trim())),
    ];

    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, name, price, is_available")
      .in("id", productIds);

    if (productsError || !products) {
      return NextResponse.json(
        { error: "Could not validate menu items" },
        { status: 500 },
      );
    }

    const productMap = new Map(
      products.map((p) => [p.id as string, p as {
        id: string;
        name: string;
        price: number;
        is_available: boolean;
      }]),
    );

    const portionIds = [
      ...new Set(
        items
          .map((i) => i.portionId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const portionMap = new Map<
      string,
      {
        id: string;
        product_id: string;
        name: string;
        price: number;
        is_available: boolean;
      }
    >();

    if (portionIds.length > 0) {
      const { data: portions, error: portionsError } = await admin
        .from("product_portions")
        .select("id, product_id, name, price, is_available")
        .in("id", portionIds);

      if (portionsError || !portions) {
        return NextResponse.json(
          { error: "Could not validate portions" },
          { status: 500 },
        );
      }
      for (const p of portions) {
        portionMap.set(p.id as string, p as {
          id: string;
          product_id: string;
          name: string;
          price: number;
          is_available: boolean;
        });
      }
    }

    const lineRows: {
      product_id: string;
      product_name: string;
      portion_name: string | null;
      unit_price: number;
      quantity: number;
      notes: string | null;
    }[] = [];

    let subtotal = 0;

    for (const item of items) {
      const productId = item.productId!.trim();
      const qty = Math.floor(Number(item.quantity));
      if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
        return NextResponse.json(
          { error: "Invalid item quantity" },
          { status: 400 },
        );
      }

      const product = productMap.get(productId);
      if (!product || !product.is_available) {
        return NextResponse.json(
          {
            error: `${item.name?.trim() || "An item"} is no longer available`,
          },
          { status: 409 },
        );
      }

      let unitPrice = Number(product.price);
      let portionName: string | null = null;
      const portionId = item.portionId?.trim() || null;

      if (portionId) {
        const portion = portionMap.get(portionId);
        if (
          !portion ||
          portion.product_id !== productId ||
          !portion.is_available
        ) {
          return NextResponse.json(
            {
              error: `${item.name?.trim() || product.name} portion is unavailable`,
            },
            { status: 409 },
          );
        }
        unitPrice = Number(portion.price);
        portionName = portion.name;
      }

      unitPrice = money(unitPrice);
      subtotal = money(subtotal + unitPrice * qty);

      lineRows.push({
        product_id: productId,
        product_name: product.name,
        portion_name: portionName,
        unit_price: unitPrice,
        quantity: qty,
        notes: item.notes?.trim() || null,
      });
    }

    const minOrder = Number(settings.min_order ?? 0);
    if (subtotal < minOrder) {
      return NextResponse.json(
        { error: `Minimum order is ${minOrder}` },
        { status: 409 },
      );
    }

    const deliveryFee =
      fulfillment === "delivery" ? money(Number(settings.delivery_fee ?? 0)) : 0;
    const total = money(subtotal + deliveryFee);

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        fulfillment_type: fulfillment,
        delivery_address:
          fulfillment === "delivery"
            ? {
                line1: body.line1!.trim(),
                line2: body.line2?.trim() || undefined,
                city: body.city!.trim(),
              }
            : null,
        customer_phone: phone,
        customer_name: customerName,
        payment_method: payment,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: orderNotes,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("order otp create order", orderError);
      return NextResponse.json(
        { error: orderError?.message ?? "Could not place order" },
        { status: 500 },
      );
    }

    const { error: itemsError } = await admin.from("order_items").insert(
      lineRows.map((row) => ({
        order_id: order.id,
        ...row,
      })),
    );

    if (itemsError) {
      console.error("order otp create items", itemsError);
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: itemsError.message || "Could not save order items" },
        { status: 500 },
      );
    }

    const profileUpdate: Record<string, unknown> = {
      full_name: customerName,
      phone,
    };
    if (fulfillment === "delivery") {
      profileUpdate.default_address = {
        line1: body.line1!.trim(),
        line2: body.line2?.trim() || undefined,
        city: body.city!.trim(),
      };
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);

    if (profileError) {
      console.error("order otp profile update", profileError);
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
    });
  } catch (err) {
    console.error("order otp verify", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Verification failed. Try again.",
      },
      { status: 500 },
    );
  }
}
