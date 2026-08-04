"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  LayoutList,
  MapPin,
  Package,
  Phone,
  Printer,
  RefreshCw,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_STYLES, orderTicketLabel } from "@/lib/admin-order-ui";
import {
  AGE_STYLES,
  ageLevel,
  isActiveOrder,
  minutesSince,
} from "@/lib/admin-metrics";
import {
  advanceLabel,
  formatAddress,
  nextStatusFor,
} from "@/lib/admin-order-flow";
import { printOrderTicket } from "@/lib/print-order-ticket";
import {
  formatMoney,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  type FulfillmentType,
  type OrderStatus,
  type OrderWithItems,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { MarkNotificationsRead } from "@/components/mark-notifications-read";
import { useNotifications, adminOrderNotificationId } from "@/lib/notification-store";
import { notifyOrderSms } from "@/lib/notify-order-sms";
import { notifyOrderTelegram } from "@/lib/notify-order-telegram";
import { cn } from "@/lib/utils";

const BOARD_COLUMNS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
];

type FulfillmentFilter = "all" | FulfillmentType;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [fulfillment, setFulfillment] = useState<FulfillmentFilter>("all");
  const [boardTab, setBoardTab] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const removeNotification = useNotifications((s) => s.remove);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    else setRefreshing(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(150);
    setLoading(false);
    setRefreshing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders((data ?? []) as OrderWithItems[]);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void load();

    async function connectRealtime() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (disposed) return;

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(`admin-orders-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            void load({ soft: true });
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "order_items" },
          () => {
            void load({ soft: true });
          },
        )
        .subscribe((status) => {
          if (disposed) return;
          setLive(status === "SUBSCRIBED");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setLive(false);
          }
        });
    }

    void connectRealtime();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    });

    // Backup poll so the board stays fresh even if realtime drops
    const pollId = window.setInterval(() => {
      void load({ soft: true });
    }, 10_000);
    const tickId = window.setInterval(() => setTick((t) => t + 1), 15_000);

    return () => {
      disposed = true;
      authSub.unsubscribe();
      window.clearInterval(pollId);
      window.clearInterval(tickId);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    const prev = orders;
    setBusyIds((s) => new Set(s).add(orderId));
    setOrders((list) =>
      list.map((o) => (o.id === orderId ? { ...o, status } : o)),
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    setBusyIds((s) => {
      const next = new Set(s);
      next.delete(orderId);
      return next;
    });
    if (error) {
      setOrders(prev);
      toast.error(error.message);
      return;
    }
    toast.success(ORDER_STATUS_LABELS[status]);
    if (status === "completed") {
      notifyOrderSms(orderId, "completed");
    }
    if (
      status === "confirmed" ||
      status === "cancelled" ||
      status === "completed"
    ) {
      notifyOrderTelegram(orderId, status);
    }
    if (status === "cancelled" || status === "completed") {
      removeNotification(adminOrderNotificationId(orderId));
      setSelectedId((id) => (id === orderId ? null : id));
    }
  }

  const filtered = useMemo(() => {
    void tick;
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (fulfillment !== "all" && o.fulfillment_type !== fulfillment) {
        return false;
      }
      if (!q) return true;
      const hay = [
        o.customer_name,
        o.customer_phone,
        o.id,
        orderTicketLabel(o),
        ...o.order_items.map((i) => i.product_name),
        o.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, fulfillment, tick]);

  const boardColumns = useMemo(() => {
    return BOARD_COLUMNS.map((status) => ({
      status,
      orders: filtered
        .filter((o) => o.status === status)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    }));
  }, [filtered]);

  const visibleBoardColumns = useMemo(() => {
    if (boardTab === "all") return boardColumns;
    return boardColumns.filter((c) => c.status === boardTab);
  }, [boardColumns, boardTab]);

  const stats = useMemo(() => {
    const active = filtered.filter((o) => isActiveOrder(o.status));
    const overdue = active.filter(
      (o) => ageLevel(minutesSince(o.created_at)) === "overdue",
    ).length;
    return {
      active: active.length,
      overdue,
      pending: filtered.filter((o) => o.status === "pending").length,
      ready: filtered.filter((o) => o.status === "ready").length,
    };
  }, [filtered]);

  const selected = selectedId
    ? (orders.find((o) => o.id === selectedId) ?? null)
    : null;
  const cancelTarget = cancelId
    ? (orders.find((o) => o.id === cancelId) ?? null)
    : null;

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden">
      <MarkNotificationsRead scope="admin" />
      <AdminPageHeader
        title="Kitchen board"
        description="Confirm, prep, and complete tickets · live + auto-refresh"
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link href="/admin/orders/list" />}>
              <LayoutList className="size-3.5" />
              All orders
            </Button>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium",
                live
                  ? "border-[#4880ff]/30 bg-[#4880ff]/10 text-[#4880ff]"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  live ? "animate-pulse bg-[#4880ff]" : "bg-zinc-400",
                )}
              />
              {live ? "Live" : "Polling"}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => void load({ soft: true })}
            >
              <RefreshCw
                className={cn("size-3.5", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          icon={Flame}
          label="Active"
          value={stats.active}
          tone="default"
        />
        <StatChip
          icon={AlertTriangle}
          label="Overdue 25m+"
          value={stats.overdue}
          tone={stats.overdue ? "danger" : "default"}
        />
        <StatChip
          icon={Clock3}
          label="Pending"
          value={stats.pending}
          tone={stats.pending ? "warn" : "default"}
        />
        <StatChip
          icon={CheckCircle2}
          label="Ready"
          value={stats.ready}
          tone={stats.ready ? "ok" : "default"}
        />
      </div>

      <div className="admin-panel sticky top-[4.25rem] z-10 space-y-3 rounded-xl p-3 md:top-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, item, #id…"
              className="h-11 rounded-lg border-[var(--admin-line)] bg-white pl-10 text-base"
            />
            {query ? (
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <div className="flex gap-1.5">
            {(
              [
                ["all", "All"],
                ["pickup", "Pickup"],
                ["delivery", "Delivery"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFulfillment(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  fulfillment === value
                    ? "border-[#4880ff] bg-[#4880ff] text-white"
                    : "border-border bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "delivery" ? (
                  <Bike className="size-4" />
                ) : value === "pickup" ? (
                  <Package className="size-4" />
                ) : null}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 xl:hidden">
            <button
              type="button"
              onClick={() => setBoardTab("all")}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium",
                boardTab === "all"
                  ? "border-[#4880ff] bg-[#4880ff] text-white"
                  : "border-border bg-white text-muted-foreground",
              )}
            >
              All stages
            </button>
            {boardColumns.map((col) => (
              <button
                key={col.status}
                type="button"
                onClick={() => setBoardTab(col.status)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
                  boardTab === col.status
                    ? "border-[#4880ff] bg-[#4880ff] text-white"
                    : "border-border bg-white text-muted-foreground",
                )}
              >
                {ORDER_STATUS_LABELS[col.status]}
                <span className="rounded-md bg-black/10 px-1.5 py-0.5 text-[10px] tabular-nums">
                  {col.orders.length}
                </span>
              </button>
            ))}
          </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl bg-muted/50"
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "w-full max-w-full",
            boardTab === "all"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
              : "mx-auto w-full max-w-xl",
          )}
        >
          {visibleBoardColumns.map((col) => (
            <section
              key={col.status}
              className="flex min-w-0 flex-col rounded-xl border border-[var(--admin-line)] bg-[var(--admin-canvas)]/70 p-2"
            >
              <header className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2">
                <OrderStatusBadge status={col.status} />
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {col.orders.length}
                </span>
              </header>
              <div className="flex max-h-[calc(100vh-17rem)] flex-col gap-2.5 overflow-x-hidden overflow-y-auto pr-0.5">
                {col.orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    compact
                    busy={busyIds.has(order.id)}
                    onOpen={() => setSelectedId(order.id)}
                    onAdvance={(next) => void updateStatus(order.id, next)}
                    onCancel={() => setCancelId(order.id)}
                    onPrint={() => printOrderTicket(order)}
                  />
                ))}
                {col.orders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 px-3 py-10 text-center text-xs text-muted-foreground">
                    No tickets here
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}

      <OrderDetailSheet
        order={selected}
        busy={selected ? busyIds.has(selected.id) : false}
        onClose={() => setSelectedId(null)}
        onAdvance={(next) => {
          if (selected) void updateStatus(selected.id, next);
        }}
        onCancel={() => {
          if (selected) setCancelId(selected.id);
        }}
        onPrint={() => {
          if (selected) printOrderTicket(selected);
        }}
        onSetStatus={(status) => {
          if (selected) void updateStatus(selected.id, status);
        }}
      />

      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `#${orderTicketLabel(cancelTarget)} · ${cancelTarget.customer_name || cancelTarget.customer_phone} will be marked cancelled. This can’t be undone from the board.`
                : null}
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

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  tone: "default" | "danger" | "warn" | "ok";
}) {
  return (
    <div
      className={cn(
        "admin-panel flex items-center gap-3 rounded-xl px-3.5 py-3",
        tone === "danger" && "border-red-200 bg-red-50",
        tone === "warn" && "border-amber-200 bg-amber-50",
        tone === "ok" && "border-emerald-200 bg-emerald-50",
      )}
    >
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          tone === "danger" && "bg-red-100 text-red-700",
          tone === "warn" && "bg-amber-100 text-amber-700",
          tone === "ok" && "bg-emerald-100 text-emerald-700",
          tone === "default" && "bg-[#eef3ff] text-[#4880ff]",
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums leading-none">{value}</p>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  compact,
  busy,
  onOpen,
  onAdvance,
  onCancel,
  onPrint,
}: {
  order: OrderWithItems;
  compact?: boolean;
  busy?: boolean;
  onOpen: () => void;
  onAdvance: (status: OrderStatus) => void;
  onCancel: () => void;
  onPrint: () => void;
}) {
  const mins = minutesSince(order.created_at);
  const level = isActiveOrder(order.status) ? ageLevel(mins) : "fresh";
  const next = nextStatusFor(order.status, order.fulfillment_type);
  const action = advanceLabel(order.status, order.fulfillment_type);
  const styles = ORDER_STATUS_STYLES[order.status];
  const itemCount = order.order_items.reduce((s, i) => s + i.quantity, 0);
  const address = formatAddress(order.delivery_address);

  return (
    <article
      className={cn(
        "group rounded-xl border bg-white shadow-sm ring-1 transition hover:shadow-md",
        AGE_STYLES[level].ring,
        styles.soft,
        busy && "opacity-70",
        compact ? "p-3.5" : "admin-panel p-5",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "truncate font-semibold tracking-tight",
                  compact ? "text-base" : "text-lg",
                )}
              >
                {order.customer_name || "Customer"}
              </p>
              <span className="rounded-md bg-background/90 px-1.5 py-0.5 font-mono text-xs text-muted-foreground ring-1 ring-border">
                #{orderTicketLabel(order)}
              </span>
            </div>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              {order.customer_phone}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {!compact ? <OrderStatusBadge status={order.status} /> : null}
            {isActiveOrder(order.status) ? (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums",
                  AGE_STYLES[level].label,
                )}
              >
                {mins}m
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {format(new Date(order.created_at), "h:mm a")}
            {!compact ? (
              <>
                <span>·</span>
                {formatDistanceToNow(new Date(order.created_at), {
                  addSuffix: true,
                })}
              </>
            ) : null}
          </span>
          <span className="inline-flex items-center gap-1.5 capitalize">
            {order.fulfillment_type === "delivery" ? (
              <Bike className="size-3.5" />
            ) : (
              <Package className="size-3.5" />
            )}
            {order.fulfillment_type}
          </span>
          <span>
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>

        <ul
          className={cn(
            "mt-3 space-y-1.5 rounded-xl bg-background/75 p-3 text-base",
            !compact && "border border-border/60",
          )}
        >
          {(compact ? order.order_items.slice(0, 4) : order.order_items).map(
            (item) => (
              <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        <span className="font-semibold text-primary">
                          {item.quantity}×
                        </span>{" "}
                        {item.product_name}
                        {item.portion_name &&
                        !item.product_name.includes(`(${item.portion_name})`) ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {item.portion_name}
                          </span>
                        ) : null}
                        {item.notes ? (
                          <span className="block text-sm text-muted-foreground">
                            {item.notes}
                          </span>
                        ) : null}
                      </span>
                {!compact ? (
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(Number(item.unit_price) * item.quantity)}
                  </span>
                ) : null}
              </li>
            ),
          )}
          {compact && order.order_items.length > 4 ? (
            <li className="text-sm text-muted-foreground">
              +{order.order_items.length - 4} more · tap for details
            </li>
          ) : null}
        </ul>

        {order.notes ? (
          <p
            className={cn(
              "mt-2.5 inline-flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-sm text-amber-950 ring-1 ring-amber-200",
              compact && "line-clamp-2",
            )}
          >
            <StickyNote className="mt-0.5 size-4 shrink-0" />
            {order.notes}
          </p>
        ) : null}

        {!compact && address ? (
          <p className="mt-2.5 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {address}
          </p>
        ) : null}
      </button>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
        <div>
          <p
            className={cn(
              "font-bold tabular-nums",
              compact ? "text-base" : "text-xl",
            )}
          >
            {formatMoney(Number(order.total))}
          </p>
          {!compact ? (
            <p className="text-sm capitalize text-muted-foreground">
              {order.payment_method.replace(/_/g, " ")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={onPrint}
            disabled={busy}
          >
            <Printer className="size-4" />
            {!compact ? "Print" : null}
          </Button>
          {isActiveOrder(order.status) ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </Button>
              {next && action ? (
                <Button
                  size="sm"
                  onClick={() => onAdvance(next)}
                  disabled={busy}
                >
                  {action}
                  <ChevronRight className="size-4" />
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function OrderDetailSheet({
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
  const mins = order ? minutesSince(order.created_at) : 0;
  const level = order && isActiveOrder(order.status) ? ageLevel(mins) : "fresh";

  return (
    <Sheet
      open={Boolean(order)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        {order ? (
          <>
            <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {order.customer_name || "Customer"}
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-normal text-muted-foreground">
                  #{orderTicketLabel(order)}
                </span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                {isActiveOrder(order.status) ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                      AGE_STYLES[level].label,
                    )}
                  >
                    {mins}m in queue
                  </span>
                ) : null}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-2 text-sm">
                <InfoRow icon={Phone} label="Phone" value={order.customer_phone} />
                <InfoRow
                  icon={Clock3}
                  label="Placed"
                  value={`${format(new Date(order.created_at), "MMM d · h:mm a")} (${formatDistanceToNow(new Date(order.created_at), { addSuffix: true })})`}
                />
                <InfoRow
                  icon={order.fulfillment_type === "delivery" ? Bike : Package}
                  label="Fulfillment"
                  value={order.fulfillment_type.replace("_", " ")}
                />
                {address ? (
                  <InfoRow icon={MapPin} label="Address" value={address} />
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Items
                </p>
                <ul className="space-y-2 rounded-xl border bg-muted/30 p-3">
                  {order.order_items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <span>
                        <span className="font-semibold text-primary">
                          {item.quantity}×
                        </span>{" "}
                        {item.product_name}
                        {item.portion_name &&
                        !item.product_name.includes(`(${item.portion_name})`) ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {item.portion_name}
                          </span>
                        ) : null}
                        {item.notes ? (
                          <span className="block text-xs text-muted-foreground">
                            {item.notes}
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatMoney(Number(item.unit_price) * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-xs capitalize text-muted-foreground">
                    {order.payment_method.replace(/_/g, " ")}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {formatMoney(Number(order.total))}
                  </p>
                </div>
              </div>

              {order.notes ? (
                <p className="inline-flex w-full items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
                  <StickyNote className="mt-0.5 size-4 shrink-0" />
                  {order.notes}
                </p>
              ) : null}

              {isActiveOrder(order.status) ? (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Jump to status
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORDER_STATUS_FLOW.filter((s) => {
                      if (
                        order.fulfillment_type === "pickup" &&
                        s === "out_for_delivery"
                      ) {
                        return false;
                      }
                      return s !== order.status;
                    }).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => onSetStatus(s)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:bg-muted",
                          ORDER_STATUS_STYLES[s].badge,
                        )}
                      >
                        {ORDER_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-0 mt-auto flex flex-wrap gap-2 border-t bg-popover/95 px-5 py-4 backdrop-blur">
              <Button variant="outline" onClick={onPrint} disabled={busy}>
                <Printer className="size-4" />
                Print ticket
              </Button>
              {isActiveOrder(order.status) ? (
                <>
                  <Button
                    variant="secondary"
                    className="text-destructive"
                    onClick={onCancel}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                  {next && action ? (
                    <Button
                      className="flex-1"
                      onClick={() => onAdvance(next)}
                      disabled={busy}
                    >
                      {action}
                      <ChevronRight className="size-4" />
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

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 px-3 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="font-medium capitalize">{value}</p>
      </div>
    </div>
  );
}
