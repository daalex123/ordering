"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoney,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type OrderWithItems,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<string>("active");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders((data ?? []) as OrderWithItems[]);
  }, []);

  useEffect(() => {
    void load();
    const supabase = createClient();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const visible = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active")
      return !["completed", "cancelled"].includes(o.status);
    return o.status === filter;
  });

  async function updateStatus(orderId: string, status: OrderStatus) {
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Updated to ${ORDER_STATUS_LABELS[status]}`);
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order board</h1>
          <p className="text-sm text-muted-foreground">Live kitchen queue</p>
        </div>
        <Select
          value={filter}
          onValueChange={(v) => {
            if (v) setFilter(v);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {ORDER_STATUS_FLOW.map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((order) => (
          <article
            key={order.id}
            className="rounded-xl border bg-card p-4 shadow-sm print:break-inside-avoid"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {order.customer_name || "Customer"} · {order.customer_phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), "MMM d · h:mm a")} ·{" "}
                  <span className="capitalize">
                    {order.fulfillment_type.replace("_", " ")}
                  </span>
                </p>
              </div>
              <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>

            <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
              {order.order_items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.product_name}
                  {item.notes ? (
                    <span className="text-muted-foreground"> — {item.notes}</span>
                  ) : null}
                </li>
              ))}
            </ul>

            {order.notes ? (
              <p className="mt-2 text-sm text-amber-800">Note: {order.notes}</p>
            ) : null}

            {order.delivery_address ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {[
                  order.delivery_address.line1,
                  order.delivery_address.line2,
                  order.delivery_address.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <p className="font-semibold">{formatMoney(Number(order.total))}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                >
                  Print
                </Button>
                {order.status !== "cancelled" &&
                order.status !== "completed" ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateStatus(order.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const idx = ORDER_STATUS_FLOW.indexOf(order.status);
                        const next =
                          ORDER_STATUS_FLOW[
                            Math.min(idx + 1, ORDER_STATUS_FLOW.length - 1)
                          ];
                        if (next && next !== order.status) {
                          void updateStatus(order.id, next);
                        }
                      }}
                    >
                      Advance
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No orders in this filter
        </p>
      ) : null}
    </div>
  );
}
