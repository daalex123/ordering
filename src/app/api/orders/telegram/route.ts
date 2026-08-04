import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isOrderTelegramEvent,
  sendOrderTelegram,
  type OrderTelegramEvent,
} from "@/lib/order-telegram";
import type { Order } from "@/types/database";

export const runtime = "nodejs";

function isStaffRole(role: string | null | undefined) {
  return role === "admin" || role === "staff";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      event?: OrderTelegramEvent;
    };
    const orderId = body.orderId?.trim();
    const event = body.event;

    if (!orderId || !isOrderTelegramEvent(event)) {
      return NextResponse.json(
        {
          error:
            "orderId and event (placed|confirmed|cancelled|completed) are required",
        },
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

    if (event === "placed" || event === "cancelled") {
      if (order.user_id !== user.id && !staff) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const statusOk =
      event === "placed"
        ? order.status === "pending"
        : order.status === event;
    if (!statusOk) {
      return NextResponse.json(
        { error: `Order is not ${event} yet` },
        { status: 409 },
      );
    }

    const result = await sendOrderTelegram(order, event);
    return NextResponse.json({ event, ...result });
  } catch (err) {
    console.error("order telegram", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to send Telegram alert. Please try again.",
      },
      { status: 500 },
    );
  }
}
