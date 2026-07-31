import { format, startOfDay, endOfDay, eachDayOfInterval, subDays, startOfMonth } from "date-fns";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  type FulfillmentType,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentMethod,
} from "@/types/database";

export type ReportOrder = Order & { order_items?: OrderItem[] };

export type DatePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "custom";

export type DateRange = { from: Date; to: Date };

export function rangeForPreset(preset: DatePreset, custom?: DateRange): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "month":
      return { from: startOfDay(startOfMonth(now)), to: endOfDay(now) };
    case "custom":
      return custom ?? {
        from: startOfDay(subDays(now, 6)),
        to: endOfDay(now),
      };
  }
}

export function isPaidOrder(status: OrderStatus) {
  return status !== "cancelled";
}

export type SalesSummary = {
  orders: number;
  paidOrders: number;
  cancelled: number;
  revenue: number;
  subtotal: number;
  deliveryFees: number;
  aov: number;
  cancelRate: number;
  pickup: number;
  delivery: number;
  completed: number;
  active: number;
};

export function salesSummary(orders: ReportOrder[]): SalesSummary {
  const paid = orders.filter((o) => isPaidOrder(o.status));
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const revenue = paid.reduce((s, o) => s + Number(o.total), 0);
  const subtotal = paid.reduce((s, o) => s + Number(o.subtotal), 0);
  const deliveryFees = paid.reduce((s, o) => s + Number(o.delivery_fee), 0);
  const pickup = paid.filter((o) => o.fulfillment_type === "pickup").length;
  const delivery = paid.filter((o) => o.fulfillment_type === "delivery").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const active = orders.filter(
    (o) =>
      o.status !== "completed" &&
      o.status !== "cancelled",
  ).length;

  return {
    orders: orders.length,
    paidOrders: paid.length,
    cancelled,
    revenue,
    subtotal,
    deliveryFees,
    aov: paid.length ? revenue / paid.length : 0,
    cancelRate: orders.length ? (cancelled / orders.length) * 100 : 0,
    pickup,
    delivery,
    completed,
    active,
  };
}

export type DailyRow = {
  date: string;
  label: string;
  orders: number;
  cancelled: number;
  revenue: number;
  aov: number;
};

export function dailySales(orders: ReportOrder[], range: DateRange): DailyRow[] {
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const dayOrders = orders.filter(
      (o) => format(new Date(o.created_at), "yyyy-MM-dd") === key,
    );
    const paid = dayOrders.filter((o) => isPaidOrder(o.status));
    const revenue = paid.reduce((s, o) => s + Number(o.total), 0);
    return {
      date: key,
      label: format(day, "MMM d"),
      orders: dayOrders.length,
      cancelled: dayOrders.filter((o) => o.status === "cancelled").length,
      revenue,
      aov: paid.length ? revenue / paid.length : 0,
    };
  });
}

export type ProductRow = {
  name: string;
  quantity: number;
  revenue: number;
  orders: number;
};

export function topProducts(orders: ReportOrder[], limit = 20): ProductRow[] {
  const map = new Map<
    string,
    { quantity: number; revenue: number; orderIds: Set<string> }
  >();

  for (const order of orders) {
    if (!isPaidOrder(order.status)) continue;
    for (const item of order.order_items ?? []) {
      const label = item.portion_name
        ? `${item.product_name} (${item.portion_name})`
        : item.product_name;
      const cur = map.get(label) ?? {
        quantity: 0,
        revenue: 0,
        orderIds: new Set<string>(),
      };
      cur.quantity += item.quantity;
      cur.revenue += Number(item.unit_price) * item.quantity;
      cur.orderIds.add(order.id);
      map.set(label, cur);
    }
  }

  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      quantity: v.quantity,
      revenue: v.revenue,
      orders: v.orderIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, limit);
}

export type StatusRow = {
  status: OrderStatus;
  label: string;
  count: number;
  revenue: number;
};

export function statusBreakdown(orders: ReportOrder[]): StatusRow[] {
  const statuses = [...ORDER_STATUS_FLOW, "cancelled" as const];
  return statuses.map((status) => {
    const rows = orders.filter((o) => o.status === status);
    return {
      status,
      label: ORDER_STATUS_LABELS[status],
      count: rows.length,
      revenue: rows
        .filter((o) => isPaidOrder(o.status))
        .reduce((s, o) => s + Number(o.total), 0),
    };
  });
}

export type FulfillmentRow = {
  type: FulfillmentType;
  label: string;
  count: number;
  revenue: number;
  share: number;
};

export function fulfillmentMix(orders: ReportOrder[]): FulfillmentRow[] {
  const paid = orders.filter((o) => isPaidOrder(o.status));
  const total = paid.length || 1;
  return (["pickup", "delivery"] as const).map((type) => {
    const rows = paid.filter((o) => o.fulfillment_type === type);
    const revenue = rows.reduce((s, o) => s + Number(o.total), 0);
    return {
      type,
      label: type === "pickup" ? "Pickup" : "Delivery",
      count: rows.length,
      revenue,
      share: (rows.length / total) * 100,
    };
  });
}

export type PaymentRow = {
  method: PaymentMethod;
  label: string;
  count: number;
  revenue: number;
};

export function paymentMix(orders: ReportOrder[]): PaymentRow[] {
  const paid = orders.filter((o) => isPaidOrder(o.status));
  const methods: { method: PaymentMethod; label: string }[] = [
    { method: "cod", label: "Cash on delivery" },
    { method: "pay_at_pickup", label: "Pay at pickup" },
  ];
  return methods.map(({ method, label }) => {
    const rows = paid.filter((o) => o.payment_method === method);
    return {
      method,
      label,
      count: rows.length,
      revenue: rows.reduce((s, o) => s + Number(o.total), 0),
    };
  });
}

export type HourRow = {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
};

export function peakHours(orders: ReportOrder[]): HourRow[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, "0")}:00`,
    orders: 0,
    revenue: 0,
  }));
  for (const order of orders) {
    const h = new Date(order.created_at).getHours();
    buckets[h].orders += 1;
    if (isPaidOrder(order.status)) {
      buckets[h].revenue += Number(order.total);
    }
  }
  return buckets;
}

export function toCsv(headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join(
    "\n",
  );
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
