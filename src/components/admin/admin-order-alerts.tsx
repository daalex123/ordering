"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { orderTicketLabel } from "@/lib/admin-order-ui";
import { useNotifications, adminOrderNotificationId } from "@/lib/notification-store";
import { formatMoney, type Order } from "@/types/database";

/**
 * App-wide admin alert when a new order arrives (any admin page).
 * Clears that order's notification when it is completed or cancelled.
 */
export function AdminOrderAlerts() {
  const router = useRouter();
  const push = useNotifications((s) => s.push);
  const remove = useNotifications((s) => s.remove);
  const seenIds = useRef<Set<string>>(new Set());
  const ready = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function notify(order: Order) {
      if (seenIds.current.has(order.id)) return;
      seenIds.current.add(order.id);
      if (!ready.current) return;

      const ticket = orderTicketLabel(order);
      const href = "/admin/orders";
      const title = `New order · #${ticket}`;
      const body = `${order.customer_name || order.customer_phone} · ${formatMoney(Number(order.total))}`;

      push({
        id: adminOrderNotificationId(order.id),
        scope: "admin",
        title,
        body,
        href,
      });

      toast.message(title, {
        description: body,
        duration: 10_000,
        action: {
          label: "Open",
          onClick: () => router.push(href),
        },
      });
    }

    function clearIfFinished(order: Order) {
      if (order.status !== "completed" && order.status !== "cancelled") return;
      remove(adminOrderNotificationId(order.id));
    }

    async function connect() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (disposed) return;

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      const { data } = await supabase
        .from("orders")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(100);
      if (disposed) return;
      for (const row of data ?? []) {
        seenIds.current.add(row.id as string);
      }
      ready.current = true;

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(`admin-order-alerts-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          (payload) => {
            notify(payload.new as Order);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders" },
          (payload) => {
            clearIfFinished(payload.new as Order);
          },
        )
        .subscribe();
    }

    void connect();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      disposed = true;
      authSub.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [push, remove, router]);

  return null;
}
