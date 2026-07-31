"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Clock3,
  Package,
  ShoppingBag,
  Timer,
  TrendingUp,
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
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
      <AdminPageHeader
        title="Command center"
        description="Realtime kitchen & sales pulse for today"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium",
                live
                  ? "border-teal-200 bg-teal-50 text-teal-800"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <span className="relative flex size-2">
                <span
                  className={cn(
                    "absolute inset-0 rounded-full",
                    live ? "admin-live-dot text-teal-500" : "",
                  )}
                />
                <span
                  className={cn(
                    "relative size-2 rounded-full",
                    live ? "bg-teal-500" : "bg-zinc-400",
                  )}
                />
              </span>
              {live ? "Realtime" : "Connecting"}
            </span>
            <Button render={<Link href="/admin/orders" />}>
              Open board
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </Button>
          </div>
        }
      />

      {stats.overdue > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <div>
            <p className="font-semibold">
              {stats.overdue} order{stats.overdue === 1 ? "" : "s"} past 25 min SLA
            </p>
            <p className="text-red-800/80">
              Prioritize overdue tickets on the board before taking new ones.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto shrink-0 border-red-200 bg-white"
            render={<Link href="/admin/orders" />}
          >
            Review
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Orders today"
          value={loading ? "—" : String(stats.count)}
          hint={`${stats.completed} done · ${stats.cancelled} cancelled`}
          icon={ShoppingBag}
          tone="teal"
        >
          <Sparkline values={stats.visibleHours} className="mt-3 h-9 w-full text-teal-600" />
        </MetricCard>
        <MetricCard
          title="Live queue"
          value={loading ? "—" : String(stats.active)}
          hint={
            stats.pending
              ? `${stats.pending} waiting confirmation`
              : "Nothing pending"
          }
          icon={Timer}
          tone="amber"
        >
          <div className="mt-3 flex gap-1">
            {ORDER_STATUS_FLOW.filter((s) => s !== "completed").map((s) => (
              <div
                key={s}
                className="h-1.5 flex-1 overflow-hidden rounded-md bg-muted"
                title={`${ORDER_STATUS_LABELS[s]}: ${stats.byStatus[s] ?? 0}`}
              >
                <div
                  className="h-full rounded-md bg-amber-500 transition-all"
                  style={{
                    width: `${((stats.byStatus[s] ?? 0) / pipelineMax) * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </MetricCard>
        <MetricCard
          title="Revenue"
          value={loading ? "—" : formatMoney(stats.revenue)}
          hint={stats.count ? `AOV ${formatMoney(stats.avg)}` : "No sales yet"}
          icon={Wallet}
          tone="emerald"
        >
          <Sparkline
            values={stats.visibleRevenue}
            className="mt-3 h-9 w-full text-emerald-600"
            stroke="currentColor"
          />
        </MetricCard>
        <MetricCard
          title="Avg complete time"
          value={
            loading
              ? "—"
              : stats.avgWait != null
                ? `${stats.avgWait}m`
                : "—"
          }
          hint={
            stats.avgWait != null
              ? "Order → completed today"
              : "Complete an order to measure"
          }
          icon={TrendingUp}
          tone="slate"
        >
          <p className="mt-3 text-[11px] text-muted-foreground">
            Peak hour{" "}
            <span className="font-semibold text-foreground">
              {stats.peakHour.toString().padStart(2, "0")}:00
            </span>{" "}
            · {stats.pickup} pickup / {stats.delivery} delivery
          </p>
        </MetricCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="admin-panel rounded-xl p-4 lg:col-span-7">
          <div className="mb-4 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Pipeline load
              </h2>
              <p className="text-xs text-muted-foreground">
                Volume by stage — thicker bars need staff focus
              </p>
            </div>
            <span className="admin-icon-tile">
              <Package className="size-4" strokeWidth={1.75} />
            </span>
          </div>
          <div className="space-y-3">
            {ORDER_STATUS_FLOW.map((status) => {
              const count = stats.byStatus[status] ?? 0;
              return (
                <div key={status} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3">
                  <OrderStatusBadge status={status} />
                  <div className="h-2.5 overflow-hidden rounded-md bg-muted/80">
                    <div
                      className={cn(
                        "h-full rounded-md transition-all duration-500",
                        status === "pending" && "bg-amber-400",
                        status === "confirmed" && "bg-sky-500",
                        status === "preparing" && "bg-teal-500",
                        status === "ready" && "bg-emerald-500",
                        status === "out_for_delivery" && "bg-cyan-600",
                        status === "completed" && "bg-zinc-300",
                      )}
                      style={{ width: `${(count / pipelineMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="admin-panel rounded-xl p-4 lg:col-span-5">
          <div className="mb-4 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Needs attention
              </h2>
              <p className="text-xs text-muted-foreground">
                Oldest live tickets first
              </p>
            </div>
            <span className="admin-icon-tile">
              <Clock3 className="size-4" strokeWidth={1.75} />
            </span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : stats.attention.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Queue clear — nice work
            </div>
          ) : (
            <ul className="space-y-2">
              {stats.attention.map(({ order, mins, level }) => (
                <li
                  key={order.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 ring-1",
                    AGE_STYLES[level].ring,
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {order.customer_name || order.customer_phone}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      #{orderTicketLabel(order)} · {formatMoney(Number(order.total))} ·{" "}
                      <span className="inline-flex items-center gap-0.5 capitalize">
                        {order.fulfillment_type === "delivery" ? (
                          <Bike className="size-3" />
                        ) : (
                          <Package className="size-3" />
                        )}
                        {order.fulfillment_type}
                      </span>
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
          )}
        </section>
      </div>

      <section className="admin-panel overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Latest Orders
            </h2>
            <p className="text-xs text-muted-foreground">Streaming from today</p>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/admin/orders" />}>
            Full board
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No orders yet today
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {orders.slice(0, 8).map((order) => {
              const mins = minutesSince(order.created_at);
              const level = isActiveOrder(order.status)
                ? ageLevel(mins)
                : "fresh";
              return (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--admin-canvas)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {order.customer_name || order.customer_phone}
                      </p>
                      <span className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        #{orderTicketLabel(order)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), {
                        addSuffix: true,
                      })}{" "}
                      · {formatMoney(Number(order.total))} ·{" "}
                      <span className="capitalize">
                        {order.fulfillment_type.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isActiveOrder(order.status) ? (
                      <span
                        className={cn(
                          "hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums sm:inline",
                          AGE_STYLES[level].label,
                        )}
                      >
                        {mins}m
                      </span>
                    ) : null}
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "teal" | "amber" | "emerald" | "slate";
  children?: ReactNode;
}) {
  const iconClass = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <div className="admin-panel relative overflow-hidden rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            iconClass,
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </div>
      </div>
      {children}
    </div>
  );
}
