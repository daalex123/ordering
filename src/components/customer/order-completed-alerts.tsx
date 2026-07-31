"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { orderTicketLabel } from "@/lib/admin-order-ui";
import { useNotifications } from "@/lib/notification-store";
import type { Order } from "@/types/database";

/**
 * App-wide customer alert when their order is marked completed.
 */
export function OrderCompletedAlerts() {
  const router = useRouter();
  const push = useNotifications((s) => s.push);

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function connect() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (disposed || !session?.user) return;

      await supabase.realtime.setAuth(session.access_token);

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }

      const userId = session.user.id;

      channel = supabase
        .channel(`customer-order-completed-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as Order;
            const prev = payload.old as Partial<Order> | undefined;
            if (next.status !== "completed") return;
            if (prev?.status === "completed") return;

            const ticket = orderTicketLabel(next);
            const href = `/orders/${next.id}`;
            const title = `Order #${ticket} completed`;
            const body = "Your order is done. Enjoy!";

            push({
              id: `customer-completed-${next.id}`,
              scope: "customer",
              title,
              body,
              href,
            });

            toast.success(title, {
              description: body,
              duration: 10_000,
              action: {
                label: "View",
                onClick: () => router.push(href),
              },
            });
          },
        )
        .subscribe();
    }

    void connect();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        if (channel) {
          void supabase.removeChannel(channel);
          channel = null;
        }
        return;
      }
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
        if (!channel) void connect();
      }
    });

    return () => {
      disposed = true;
      authSub.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [push, router]);

  return null;
}
