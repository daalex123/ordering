"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bike,
  Clock3,
  Package,
  ShoppingBag,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { orderTicketLabel } from "@/lib/admin-order-ui";
import {
  AGE_STYLES,
  ageLevel,
  averageWaitMinutes,
  hourlyOrderCounts,
  hourlyRevenue,
  isActiveOrder,
  minutesSince,
} from "@/lib/admin-metrics";
import {
  formatMoney,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { Sparkline } from "@/components/admin/sparkline";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const supabase = createClient();
    const channel = supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void load();
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const tickId = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(tickId);
    };
  }, [load]);

  const stats = useMemo(() => {
    void tick;
    const now = Date.now();
    const paid = orders.filter((o) => o.status !== "cancelled");
    const active = orders.filter((o) => isActiveOrder(o.status));
    const revenue = paid.reduce((sum, o) => sum + Number(o.total), 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    const avg = paid.length > 0 ? revenue / paid.length : 0;
    const delivery = paid.filter((o) => o.fulfillment_type === "delivery").length;
    const pickup = paid.filter((o) => o.fulfillment_type === "pickup").length;
    const byStatus = ORDER_STATUS_FLOW.reduce(
      (acc, status) => {
        acc[status] = orders.filter((o) => o.status === status).length;
        return acc;
      },
      {} as Record<OrderStatus, number>,
    );
    const hourOrders = hourlyOrderCounts(orders);
    const hourRevenue = hourlyRevenue(orders);
    const hour = new Date().getHours();
    const visibleHours = hourOrders.slice(Math.max(0, hour - 11), hour + 1);
    const visibleRevenue = hourRevenue.slice(Math.max(0, hour - 11), hour + 1);
    const avgWait = averageWaitMinutes(orders);
    const attention = active
      .map((o) => ({
        order: o,
        mins: minutesSince(o.created_at, now),
        level: ageLevel(minutesSince(o.created_at, now)),
      }))
      .sort((a, b) => b.mins - a.mins);
    const overdue = attention.filter((a) => a.level === "overdue").length;
    const peakHour = hourOrders.indexOf(Math.max(...hourOrders, 0));

    return {
      count: orders.length,
      revenue,
      pending,
      active: active.length,
      avg,
      delivery,
      pickup,
      byStatus,
      completed: byStatus.completed ?? 0,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      visibleHours,
      visibleRevenue,
      avgWait,
      attention: attention.slice(0, 6),
      overdue,
      peakHour,
      hourOrders,
    };
  }, [orders, tick]);

  const pipelineMax = Math.max(
    ...ORDER_STATUS_FLOW.map((s) => stats.byStatus[s] ?? 0),
    1,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] font-bold tracking-tight text-[#202224]">
          Dashboard
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold",
              live
                ? "border-[#00b69b]/30 bg-[#00b69b]/10 text-[#00b69b]"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                live ? "bg-[#00b69b]" : "bg-zinc-400",
              )}
            />
            {live ? "Realtime" : "Connecting"}
          </span>
          <Button render={<Link href="/admin/orders" />}>
            Open board
            <ArrowRight className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {stats.overdue > 0 ? (
        <div className="flex items-start gap-3 rounded-[14px] border border-[#fd5454]/30 bg-[#fd5454]/8 px-4 py-3 text-sm text-[#202224] shadow-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#fd5454]" strokeWidth={1.75} />
          <div>
            <p className="font-semibold">
              {stats.overdue} order{stats.overdue === 1 ? "" : "s"} past 25 min SLA
            </p>
            <p className="text-[#606060]">
              Prioritize overdue tickets on the board before taking new ones.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto shrink-0"
            render={<Link href="/admin/orders" />}
          >
            Review
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Order"
          value={loading ? "—" : String(stats.count)}
          hint={`${stats.completed} completed today`}
          icon={Users}
          iconTone="purple"
          trendPositive
          trendLabel={`${stats.pickup + stats.delivery} fulfilled · live`}
        />
        <MetricCard
          title="Live Queue"
          value={loading ? "—" : String(stats.active)}
          hint={
            stats.pending
              ? `${stats.pending} waiting confirmation`
              : "Nothing pending"
          }
          icon={ShoppingBag}
          iconTone="yellow"
          trendPositive={stats.pending === 0}
          trendLabel={
            stats.avgWait != null ? `Avg complete ${stats.avgWait}m` : "Awaiting first complete"
          }
        />
        <MetricCard
          title="Total Sales"
          value={loading ? "—" : formatMoney(stats.revenue)}
          hint={stats.count ? `AOV ${formatMoney(stats.avg)}` : "No sales yet"}
          icon={Wallet}
          iconTone="green"
          trendPositive
          trendLabel={`${stats.delivery} delivery · ${stats.pickup} pickup`}
        />
        <MetricCard
          title="Total Pending"
          value={loading ? "—" : String(stats.pending)}
          hint={stats.overdue ? `${stats.overdue} overdue 25m+` : "Within SLA"}
          icon={Timer}
          iconTone="orange"
          trendPositive={stats.pending === 0}
          trendLabel={
            stats.peakHour >= 0
              ? `Peak hour ${stats.peakHour.toString().padStart(2, "0")}:00`
              : "Monitoring queue"
          }
        />
      </div>

      <section className="admin-panel p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-[#202224]">Sales Details</h2>
          <span className="rounded border border-[#d5d5d5] bg-[#fcfdfd] px-3 py-1.5 text-xs font-semibold text-[#2b3034]">
            Today
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <Sparkline
              values={stats.visibleRevenue}
              className="h-48 w-full text-[#4880ff]"
              stroke="#4880ff"
            />
            <div className="mt-3 flex justify-between text-xs font-semibold text-[#606060]">
              <span>Orders/hour</span>
              <span>
                {loading ? "—" : `${stats.count} tickets · ${formatMoney(stats.revenue)}`}
              </span>
            </div>
            <Sparkline
              values={stats.visibleHours}
              className="mt-2 h-16 w-full text-[#00b69b]"
              stroke="#00b69b"
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-bold text-[#202224]">Pipeline load</p>
            {ORDER_STATUS_FLOW.map((status) => {
              const count = stats.byStatus[status] ?? 0;
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#606060]">
                      {ORDER_STATUS_LABELS[status]}
                    </span>
                    <span className="font-bold tabular-nums text-[#202224]">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f1f4f9]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        status === "pending" && "bg-[#fcbe2d]",
                        status === "confirmed" && "bg-[#4880ff]",
                        status === "preparing" && "bg-[#8280ff]",
                        status === "ready" && "bg-[#00b69b]",
                        status === "out_for_delivery" && "bg-[#4ad991]",
                        status === "completed" && "bg-[#d5d5d5]",
                      )}
                      style={{ width: `${(count / pipelineMax) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <h2 className="text-2xl font-bold text-[#202224]">Order Details</h2>
          <Button variant="outline" size="sm" render={<Link href="/admin/orders" />}>
            Full board
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2 px-6 pb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-[#f1f4f9]" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="px-6 pb-10 text-center text-sm text-[#606060]">
            No orders yet today
          </p>
        ) : (
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-[#f1f4f9] text-left">
                  {["Customer", "Type", "Time", "Ticket", "Amount", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-sm font-bold text-[#202224] first:rounded-l-xl last:rounded-r-xl"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((order) => {
                  const mins = minutesSince(order.created_at);
                  const level = isActiveOrder(order.status) ? ageLevel(mins) : "fresh";
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-[#f1f4f9] text-[#202224]/80"
                    >
                      <td className="px-4 py-4 font-semibold">
                        {order.customer_name || order.customer_phone}
                      </td>
                      <td className="px-4 py-4 capitalize">
                        <span className="inline-flex items-center gap-1">
                          {order.fulfillment_type === "delivery" ? (
                            <Bike className="size-3.5" />
                          ) : (
                            <Package className="size-3.5" />
                          )}
                          {order.fulfillment_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {format(new Date(order.created_at), "dd.MM.yyyy - hh.mm a")}
                        {isActiveOrder(order.status) ? (
                          <span
                            className={cn(
                              "ml-2 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums",
                              AGE_STYLES[level].label,
                            )}
                          >
                            {mins}m
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        #{orderTicketLabel(order)}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {formatMoney(Number(order.total))}
                      </td>
                      <td className="px-4 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {stats.attention.length > 0 ? (
        <section className="admin-panel p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-[#202224]">Needs attention</h2>
            <Clock3 className="size-4 text-[#606060]" strokeWidth={1.75} />
          </div>
          <ul className="space-y-2">
            {stats.attention.map(({ order, mins, level }) => (
              <li
                key={order.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 ring-1",
                  AGE_STYLES[level].ring,
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {order.customer_name || order.customer_phone}
                  </p>
                  <p className="text-[11px] text-[#606060]">
                    #{orderTicketLabel(order)} · {formatMoney(Number(order.total))} ·{" "}
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                      AGE_STYLES[level].label,
                    )}
                  >
                    {mins}m
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  iconTone,
  trendPositive,
  trendLabel,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  iconTone: "purple" | "yellow" | "green" | "orange";
  trendPositive: boolean;
  trendLabel: string;
}) {
  const iconWrap = {
    purple: "bg-[#8280ff]/15 text-[#8280ff]",
    yellow: "bg-[#fec53d]/20 text-[#fec53d]",
    green: "bg-[#4ad991]/20 text-[#4ad991]",
    orange: "bg-[#ff9066]/20 text-[#ff9066]",
  }[iconTone];

  return (
    <div className="admin-panel relative p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-[#202224]/70">{title}</p>
          <p className="mt-3 text-[28px] font-bold tracking-wide text-[#202224]">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-[60px] items-center justify-center rounded-full",
            iconWrap,
          )}
        >
          <Icon className="size-7" strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-4 text-xs text-[#606060]">{hint}</p>
      <p
        className={cn(
          "mt-3 flex items-center gap-1 text-sm font-semibold",
          trendPositive ? "text-[#00b69b]" : "text-[#f93c65]",
        )}
      >
        {trendPositive ? (
          <ArrowUpRight className="size-4" />
        ) : (
          <ArrowDownRight className="size-4" />
        )}
        <span className="text-[#606060] font-semibold">{trendLabel}</span>
      </p>
    </div>
  );
}
