import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendOrderCompletedSms,
  sendOrderPlacedSms,
  type OrderSmsEvent,
} from "@/lib/order-sms";
import type { Order } from "@/types/database";

export const runtime = "nodejs";

function isStaffRole(role: string | null | undefined) {
  return role === "admin" || role === "staff";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      event?: OrderSmsEvent;
    };
    const orderId = body.orderId?.trim();
    const event = body.event;

    if (!orderId || (event !== "placed" && event !== "completed")) {
      return NextResponse.json(
        { error: "orderId and event (placed|completed) are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const staff = isStaffRole(profile?.role as string | undefined);

    // Service role so we always see the order row for SMS (RLS-safe).
    const admin = createAdminClient();
    const { data: orderRow, error: orderError } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !orderRow) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderRow as Order;

    if (event === "placed") {
      if (order.user_id !== user.id && !staff) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const result = await sendOrderPlacedSms(order);
      return NextResponse.json({ ok: true, event, ...result });
    }

    // completed
    if (!staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.status !== "completed") {
      return NextResponse.json(
        { error: "Order is not completed yet" },
        { status: 409 },
      );
    }

    const result = await sendOrderCompletedSms(order);
    return NextResponse.json({ ok: true, event, ...result });
  } catch (err) {
    console.error("order sms", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to send order SMS. Please try again.",
      },
      { status: 500 },
    );
  }
}
