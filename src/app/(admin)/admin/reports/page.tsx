"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  BarChart3,
  Bike,
  Download,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  dailySales,
  downloadCsv,
  fulfillmentMix,
  paymentMix,
  peakHours,
  rangeForPreset,
  salesSummary,
  statusBreakdown,
  toCsv,
  topProducts,
  type DatePreset,
  type ReportOrder,
} from "@/lib/admin-reports";

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

export default function AdminReportsPage() {
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const range = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return rangeForPreset("custom", {
        from: new Date(`${customFrom}T00:00:00`),
        to: new Date(`${customTo}T23:59:59.999`),
      });
    }
    return rangeForPreset(preset === "custom" ? "7d" : preset);
  }, [preset, customFrom, customTo]);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      else setRefreshing(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000);
      setLoading(false);
      setRefreshing(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setOrders((data ?? []) as ReportOrder[]);
    },
    [range.from, range.to],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => salesSummary(orders), [orders]);
  const daily = useMemo(() => dailySales(orders, range), [orders, range]);
  const products = useMemo(() => topProducts(orders), [orders]);
  const statuses = useMemo(() => statusBreakdown(orders), [orders]);
  const fulfillment = useMemo(() => fulfillmentMix(orders), [orders]);
  const payments = useMemo(() => paymentMix(orders), [orders]);
  const hours = useMemo(() => peakHours(orders), [orders]);
  const peakHourMax = Math.max(...hours.map((h) => h.orders), 1);
  const statusMax = Math.max(...statuses.map((s) => s.count), 1);

  function exportDaily() {
    const csv = toCsv(
      ["Date", "Orders", "Cancelled", "Revenue", "AOV"],
      daily.map((d) => [
        d.date,
        d.orders,
        d.cancelled,
        d.revenue.toFixed(2),
        d.aov.toFixed(2),
      ]),
    );
    downloadCsv(`daily-sales-${format(range.from, "yyyyMMdd")}-${format(range.to, "yyyyMMdd")}.csv`, csv);
    toast.success("Daily sales exported");
  }

  function exportProducts() {
    const csv = toCsv(
      ["Product", "Qty sold", "Orders", "Revenue"],
      products.map((p) => [
        p.name,
        p.quantity,
        p.orders,
        p.revenue.toFixed(2),
      ]),
    );
    downloadCsv(`top-products-${format(range.from, "yyyyMMdd")}-${format(range.to, "yyyyMMdd")}.csv`, csv);
    toast.success("Product report exported");
  }

  function exportOrders() {
    const csv = toCsv(
      [
        "Order #",
        "Created",
        "Customer",
        "Phone",
        "Status",
        "Fulfillment",
        "Payment",
        "Subtotal",
        "Delivery fee",
        "Total",
      ],
      orders.map((o) => [
        o.order_number ?? o.id.slice(0, 8),
        format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
        o.customer_name ?? "",
        o.customer_phone,
        o.status,
        o.fulfillment_type,
        o.payment_method,
        Number(o.subtotal).toFixed(2),
        Number(o.delivery_fee).toFixed(2),
        Number(o.total).toFixed(2),
      ]),
    );
    downloadCsv(`orders-${format(range.from, "yyyyMMdd")}-${format(range.to, "yyyyMMdd")}.csv`, csv);
    toast.success("Order report exported");
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reports"
        description={`${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing || loading}
              onClick={() => void load({ soft: true })}
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" disabled={!orders.length} onClick={exportOrders}>
              <Download className="size-3.5" />
              Export orders
            </Button>
          </>
        }
      />

      <div className="admin-panel space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-semibold transition",
                preset === p.id
                  ? "border-[#4880ff] bg-[#4880ff] text-white"
                  : "border-[#e0e2e7] bg-white text-[#202224] hover:bg-[#f5f6fa]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 w-[11rem] bg-[#f5f6fa]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 w-[11rem] bg-[#f5f6fa]"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          title="Revenue"
          value={loading ? "—" : formatMoney(summary.revenue)}
          hint={`Subtotal ${formatMoney(summary.subtotal)} · fees ${formatMoney(summary.deliveryFees)}`}
          icon={Wallet}
          tone="green"
        />
        <Kpi
          title="Orders"
          value={loading ? "—" : String(summary.orders)}
          hint={`${summary.paidOrders} paid · ${summary.completed} completed`}
          icon={ShoppingBag}
          tone="blue"
        />
        <Kpi
          title="Avg order value"
          value={loading ? "—" : formatMoney(summary.aov)}
          hint={`${summary.active} still in kitchen`}
          icon={TrendingUp}
          tone="purple"
        />
        <Kpi
          title="Cancellations"
          value={loading ? "—" : String(summary.cancelled)}
          hint={`${summary.cancelRate.toFixed(1)}% cancel rate`}
          icon={XCircle}
          tone="red"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[#202224]">Fulfillment mix</h2>
            <BarChart3 className="size-4 text-[#606060]" />
          </div>
          <div className="space-y-4">
            {fulfillment.map((row) => (
              <div key={row.type} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold text-[#202224]">
                    {row.type === "delivery" ? (
                      <Bike className="size-4 text-[#4880ff]" />
                    ) : (
                      <Package className="size-4 text-[#00b69b]" />
                    )}
                    {row.label}
                  </span>
                  <span className="font-bold tabular-nums">
                    {row.count} · {formatMoney(row.revenue)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#f1f4f9]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      row.type === "delivery" ? "bg-[#4880ff]" : "bg-[#00b69b]",
                    )}
                    style={{ width: `${row.share}%` }}
                  />
                </div>
                <p className="text-xs text-[#606060]">{row.share.toFixed(1)}% of paid orders</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[#202224]">Payment methods</h2>
          </div>
          <ul className="space-y-3">
            {payments.map((row) => (
              <li
                key={row.method}
                className="flex items-center justify-between rounded-xl bg-[#f5f6fa] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#202224]">{row.label}</p>
                  <p className="text-xs text-[#606060]">{row.count} orders</p>
                </div>
                <p className="text-sm font-bold tabular-nums text-[#202224]">
                  {formatMoney(row.revenue)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="admin-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-lg font-bold text-[#202224]">Daily sales</h2>
          <Button variant="outline" size="sm" disabled={!daily.length} onClick={exportDaily}>
            <Download className="size-3.5" />
            CSV
          </Button>
        </div>
        <div className="overflow-x-auto px-3 pb-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-[#f1f4f9] text-left">
                {["Date", "Orders", "Cancelled", "Revenue", "AOV"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-bold text-[#202224] first:rounded-l-xl last:rounded-r-xl">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[#606060]">
                    Loading…
                  </td>
                </tr>
              ) : daily.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[#606060]">
                    No data in range
                  </td>
                </tr>
              ) : (
                daily.map((d) => (
                  <tr key={d.date} className="border-b border-[#f1f4f9]">
                    <td className="px-3 py-3 font-semibold text-[#202224]">{d.label}</td>
                    <td className="px-3 py-3 tabular-nums">{d.orders}</td>
                    <td className="px-3 py-3 tabular-nums">{d.cancelled}</td>
                    <td className="px-3 py-3 font-semibold tabular-nums">
                      {formatMoney(d.revenue)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{formatMoney(d.aov)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <h2 className="text-lg font-bold text-[#202224]">Top products</h2>
            <Button variant="outline" size="sm" disabled={!products.length} onClick={exportProducts}>
              <Download className="size-3.5" />
              CSV
            </Button>
          </div>
          <div className="overflow-x-auto px-3 pb-4">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="bg-[#f1f4f9] text-left">
                  {["Product", "Qty", "Orders", "Revenue"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-bold text-[#202224] first:rounded-l-xl last:rounded-r-xl">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[#606060]">
                      Loading…
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[#606060]">
                      No product sales in range
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.name} className="border-b border-[#f1f4f9]">
                      <td className="max-w-[14rem] truncate px-3 py-3 font-semibold text-[#202224]">
                        {p.name}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{p.quantity}</td>
                      <td className="px-3 py-3 tabular-nums">{p.orders}</td>
                      <td className="px-3 py-3 font-semibold tabular-nums">
                        {formatMoney(p.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel p-5">
          <h2 className="mb-4 text-lg font-bold text-[#202224]">Orders by status</h2>
          <div className="space-y-3">
            {statuses.map((row) => (
              <div key={row.status} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#606060]">{row.label}</span>
                  <span className="font-bold tabular-nums text-[#202224]">
                    {row.count}
                    {row.status !== "cancelled" && row.revenue > 0
                      ? ` · ${formatMoney(row.revenue)}`
                      : ""}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#f1f4f9]">
                  <div
                    className="h-full rounded-full bg-[#4880ff]"
                    style={{ width: `${(row.count / statusMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-panel p-5">
        <h2 className="mb-4 text-lg font-bold text-[#202224]">Peak hours</h2>
        <div className="flex h-40 items-end gap-1 overflow-x-auto pb-1">
          {hours.map((h) => (
            <div
              key={h.hour}
              className="flex min-w-6 flex-1 flex-col items-center gap-1"
              title={`${h.label}: ${h.orders} orders · ${formatMoney(h.revenue)}`}
            >
              <div
                className="w-full rounded-t bg-[#4880ff]/80 transition-all"
                style={{
                  height: `${Math.max(4, (h.orders / peakHourMax) * 100)}%`,
                  opacity: h.orders ? 1 : 0.2,
                }}
              />
              <span className="text-[9px] font-semibold text-[#606060]">
                {h.hour % 3 === 0 ? h.hour : ""}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#606060]">
          Hover bars for order count and revenue by hour of day
        </p>
      </section>
    </div>
  );
}

function Kpi({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  tone: "green" | "blue" | "purple" | "red";
}) {
  const wrap = {
    green: "bg-[#4ad991]/15 text-[#4ad991]",
    blue: "bg-[#4880ff]/15 text-[#4880ff]",
    purple: "bg-[#8280ff]/15 text-[#8280ff]",
    red: "bg-[#fd5454]/15 text-[#fd5454]",
  }[tone];

  return (
    <div className="admin-panel p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#202224]/70">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#202224]">{value}</p>
          <p className="mt-2 text-xs text-[#606060]">{hint}</p>
        </div>
        <div className={cn("flex size-12 items-center justify-center rounded-full", wrap)}>
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
