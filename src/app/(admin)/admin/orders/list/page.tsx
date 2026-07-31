"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { toast } from "sonner";
import {
  Bike,
  Columns3,
  Download,
  Eye,
  Package,
  Phone,
  Printer,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { orderTicketLabel } from "@/lib/admin-order-ui";
import { formatAddress, nextStatusFor, advanceLabel } from "@/lib/admin-order-flow";
import { printOrderTicket } from "@/lib/print-order-ticket";
import { notifyOrderSms } from "@/lib/notify-order-sms";
import {
  formatMoney,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  type FulfillmentType,
  type OrderStatus,
  type OrderWithItems,
} from "@/types/database";
import { downloadCsv, toCsv } from "@/lib/admin-reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | OrderStatus;
type FulfillmentFilter = "all" | FulfillmentType;
type DateFilter = "all" | "today" | "7d" | "30d";

const PAGE_SIZE = 25;

function isActiveStatus(status: OrderStatus) {
  return status !== "completed" && status !== "cancelled";
}

export default function AdminOrdersListPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [fulfillment, setFulfillment] = useState<FulfillmentFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    else setRefreshing(true);
    const supabase = createClient();
    let q = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (dateFilter === "today") {
      q = q.gte("created_at", startOfDay(new Date()).toISOString());
    } else if (dateFilter === "7d") {
      q = q.gte("created_at", startOfDay(subDays(new Date(), 6)).toISOString());
    } else if (dateFilter === "30d") {
      q = q.gte("created_at", startOfDay(subDays(new Date(), 29)).toISOString());
    }

    const { data, error } = await q;
    setLoading(false);
    setRefreshing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders((data ?? []) as OrderWithItems[]);
  }, [dateFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [query, status, fulfillment, dateFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (fulfillment !== "all" && o.fulfillment_type !== fulfillment) return false;
      if (status === "active" && !isActiveStatus(o.status)) return false;
      if (
        status !== "all" &&
        status !== "active" &&
        o.status !== status
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        o.customer_name,
        o.customer_phone,
        orderTicketLabel(o),
        o.status,
        o.fulfillment_type,
        o.payment_method,
        ...o.order_items.map((i) => i.product_name),
        o.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, status, fulfillment]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selected = selectedId
    ? (orders.find((o) => o.id === selectedId) ?? null)
    : null;
  const cancelTarget = cancelId
    ? (orders.find((o) => o.id === cancelId) ?? null)
    : null;

  async function updateStatus(id: string, next: OrderStatus) {
    setBusyIds((s) => new Set(s).add(id));
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", id);
    setBusyIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: next } : o)),
    );
    toast.success(`Order → ${ORDER_STATUS_LABELS[next]}`);
    if (next === "completed") {
      notifyOrderSms(id, "completed");
    }
  }

  function exportCsv() {
    const csv = toCsv(
      [
        "Order #",
        "Created",
        "Customer",
        "Phone",
        "Status",
        "Fulfillment",
        "Payment",
        "Items",
        "Total",
      ],
      filtered.map((o) => [
        orderTicketLabel(o),
        format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
        o.customer_name ?? "",
        o.customer_phone,
        o.status,
        o.fulfillment_type,
        o.payment_method,
        o.order_items
          .map((i) => `${i.quantity}× ${i.product_name}`)
          .join("; "),
        Number(o.total).toFixed(2),
      ]),
    );
    downloadCsv(`orders-list-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv);
    toast.success("Orders exported");
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Orders"
        description="Searchable history of all tickets — separate from the kitchen board"
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link href="/admin/orders" />}>
              <Columns3 className="size-3.5" />
              Kitchen board
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!filtered.length}
              onClick={exportCsv}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => void load({ soft: true })}
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="admin-panel space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#606060]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, ticket #, item…"
            className="h-11 rounded-lg bg-[#f5f6fa] pl-10"
          />
          {query ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-[#606060] hover:bg-white"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All time"],
              ["today", "Today"],
              ["7d", "7 days"],
              ["30d", "30 days"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDateFilter(value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                dateFilter === value
                  ? "border-[#4880ff] bg-[#4880ff] text-white"
                  : "border-[#e0e2e7] bg-white text-[#202224] hover:bg-[#f5f6fa]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ...ORDER_STATUS_FLOW.map((s) => [s, ORDER_STATUS_LABELS[s]] as const),
              ["cancelled", "Cancelled"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value as StatusFilter)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                status === value
                  ? "border-[#4880ff] bg-[#4880ff] text-white"
                  : "border-[#e0e2e7] bg-white text-[#202224] hover:bg-[#f5f6fa]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All types"],
              ["pickup", "Pickup"],
              ["delivery", "Delivery"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFulfillment(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                fulfillment === value
                  ? "border-[#4880ff] bg-[#4880ff] text-white"
                  : "border-[#e0e2e7] bg-white text-[#202224] hover:bg-[#f5f6fa]",
              )}
            >
              {value === "delivery" ? (
                <Bike className="size-3.5" />
              ) : value === "pickup" ? (
                <Package className="size-3.5" />
              ) : null}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-panel overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-[#f1f4f9] px-4 py-3">
          <p className="text-sm font-semibold text-[#202224]">
            {loading ? "Loading…" : `${filtered.length} order${filtered.length === 1 ? "" : "s"}`}
          </p>
          <p className="text-xs text-[#606060]">
            Page {page + 1} of {pageCount}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="bg-[#f1f4f9] text-left">
                {[
                  "Ticket",
                  "Customer",
                  "When",
                  "Type",
                  "Items",
                  "Total",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h || "actions"}
                    className="px-4 py-3 font-bold text-[#202224] first:rounded-none"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-10 animate-pulse rounded-lg bg-[#f1f4f9]" />
                    </td>
                  </tr>
                ))
              ) : pageOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#606060]">
                    No orders match these filters
                  </td>
                </tr>
              ) : (
                pageOrders.map((order) => {
                  const itemCount = order.order_items.reduce(
                    (s, i) => s + i.quantity,
                    0,
                  );
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-[#f1f4f9] transition hover:bg-[#f8f9fc]"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#202224]">
                        #{orderTicketLabel(order)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#202224]">
                          {order.customer_name || "Customer"}
                        </p>
                        <p className="inline-flex items-center gap-1 text-xs text-[#606060]">
                          <Phone className="size-3" />
                          {order.customer_phone}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[#606060]">
                        <p className="font-medium text-[#202224]">
                          {format(new Date(order.created_at), "MMM d · h:mm a")}
                        </p>
                        <p className="text-xs">
                          {formatDistanceToNow(new Date(order.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        <span className="inline-flex items-center gap-1.5">
                          {order.fulfillment_type === "delivery" ? (
                            <Bike className="size-3.5 text-[#4880ff]" />
                          ) : (
                            <Package className="size-3.5 text-[#00b69b]" />
                          )}
                          {order.fulfillment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#606060]">
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums text-[#202224]">
                        {formatMoney(Number(order.total))}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedId(order.id)}
                        >
                          <Eye className="size-3.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#f1f4f9] px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <OrderListDetail
        order={selected}
        busy={selected ? busyIds.has(selected.id) : false}
        onClose={() => setSelectedId(null)}
        onPrint={() => {
          if (!selected) return;
          printOrderTicket(selected);
        }}
        onAdvance={(next) => {
          if (!selected) return;
          void updateStatus(selected.id, next);
        }}
        onCancel={() => {
          if (!selected) return;
          setCancelId(selected.id);
        }}
        onSetStatus={(next) => {
          if (!selected) return;
          void updateStatus(selected.id, next);
        }}
      />

      <Dialog open={Boolean(cancelId)} onOpenChange={(o) => !o && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order?</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `Cancel #${orderTicketLabel(cancelTarget)} for ${cancelTarget.customer_name || cancelTarget.customer_phone}?`
                : "Cancel this order?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!cancelTarget) return;
                const id = cancelTarget.id;
                setCancelId(null);
                void updateStatus(id, "cancelled");
              }}
            >
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderListDetail({
  order,
  busy,
  onClose,
  onAdvance,
  onCancel,
  onPrint,
  onSetStatus,
}: {
  order: OrderWithItems | null;
  busy: boolean;
  onClose: () => void;
  onAdvance: (status: OrderStatus) => void;
  onCancel: () => void;
  onPrint: () => void;
  onSetStatus: (status: OrderStatus) => void;
}) {
  const next = order
    ? nextStatusFor(order.status, order.fulfillment_type)
    : null;
  const action = order
    ? advanceLabel(order.status, order.fulfillment_type)
    : null;
  const address = order ? formatAddress(order.delivery_address) : null;

  return (
    <Sheet
      open={Boolean(order)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {order ? (
          <>
            <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {order.customer_name || "Customer"}
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-normal">
                  #{orderTicketLabel(order)}
                </span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <span className="capitalize">{order.fulfillment_type}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-5 py-4">
              <div className="space-y-1 text-sm">
                <Label className="text-xs text-[#606060]">Phone</Label>
                <p className="font-semibold">{order.customer_phone}</p>
              </div>
              <div className="space-y-1 text-sm">
                <Label className="text-xs text-[#606060]">Placed</Label>
                <p className="font-semibold">
                  {format(new Date(order.created_at), "MMM d, yyyy · h:mm a")}
                </p>
              </div>
              <div className="space-y-1 text-sm">
                <Label className="text-xs text-[#606060]">Payment</Label>
                <p className="font-semibold capitalize">
                  {order.payment_method.replace(/_/g, " ")}
                </p>
              </div>
              {address ? (
                <div className="space-y-1 text-sm">
                  <Label className="text-xs text-[#606060]">Address</Label>
                  <p className="font-semibold">{address}</p>
                </div>
              ) : null}
              {order.notes ? (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
                  {order.notes}
                </div>
              ) : null}

              <div>
                <Label className="mb-2 block text-xs text-[#606060]">Items</Label>
                <ul className="space-y-2">
                  {order.order_items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-2 rounded-lg bg-[#f5f6fa] px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-semibold">{item.quantity}×</span>{" "}
                        {item.product_name}
                        {item.portion_name ? (
                          <span className="text-[#606060]"> · {item.portion_name}</span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-[#606060]">
                        {formatMoney(Number(item.unit_price) * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between border-t pt-3 text-sm font-bold">
                  <span>Total</span>
                  <span>{formatMoney(Number(order.total))}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-[#606060]">Set status</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[...ORDER_STATUS_FLOW, "cancelled" as const].map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy || order.status === s}
                      onClick={() => onSetStatus(s)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:bg-muted disabled:opacity-40",
                        order.status === s && "border-[#4880ff] bg-[#eef3ff] text-[#4880ff]",
                      )}
                    >
                      {ORDER_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-white px-5 py-4">
              <Button variant="outline" size="sm" onClick={onPrint} disabled={busy}>
                <Printer className="size-4" />
                Print
              </Button>
              {isActiveStatus(order.status) ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={onCancel}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                  {next && action ? (
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={() => onAdvance(next)}
                      disabled={busy}
                    >
                      {action}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
