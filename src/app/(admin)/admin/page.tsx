"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoney,
  ORDER_STATUS_LABELS,
  type Order,
} from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false });
      setOrders((data ?? []) as Order[]);
    })();
  }, []);

  const stats = useMemo(() => {
    const active = orders.filter(
      (o) => !["completed", "cancelled"].includes(o.status),
    );
    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total), 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    return { count: orders.length, revenue, pending, active: active.length };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Today · {format(new Date(), "EEEE, MMM d")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Orders today" value={String(stats.count)} />
        <Stat title="Active" value={String(stats.active)} />
        <Stat title="Pending" value={String(stats.pending)} />
        <Stat title="Revenue" value={formatMoney(stats.revenue)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Latest orders</CardTitle>
          <Link href="/admin/orders" className="text-sm text-primary">
            Open board
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {orders.slice(0, 8).map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {order.customer_name || order.customer_phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), "h:mm a")} ·{" "}
                  {formatMoney(Number(order.total))}
                </p>
              </div>
              <Badge variant="secondary">
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </div>
          ))}
          {orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No orders yet today
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
