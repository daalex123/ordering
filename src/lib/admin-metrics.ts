import type { Order, OrderStatus } from "@/types/database";

const ACTIVE: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
];

export function isActiveOrder(status: OrderStatus) {
  return ACTIVE.includes(status);
}

export function minutesSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

/** Age urgency for kitchen SLA: fresh → watch → overdue */
export function ageLevel(minutes: number): "fresh" | "watch" | "overdue" {
  if (minutes >= 25) return "overdue";
  if (minutes >= 12) return "watch";
  return "fresh";
}

export const AGE_STYLES = {
  fresh: {
    ring: "ring-transparent",
    label: "text-emerald-700 bg-emerald-50 border-emerald-200",
    bar: "bg-emerald-400",
  },
  watch: {
    ring: "ring-amber-300/60",
    label: "text-amber-800 bg-amber-50 border-amber-200",
    bar: "bg-amber-400",
  },
  overdue: {
    ring: "ring-red-300/70",
    label: "text-red-800 bg-red-50 border-red-200",
    bar: "bg-red-500",
  },
} as const;

/** Orders per hour for today (0–23), padded for sparkline */
export function hourlyOrderCounts(orders: Pick<Order, "created_at">[]) {
  const counts = Array.from({ length: 24 }, () => 0);
  for (const order of orders) {
    const h = new Date(order.created_at).getHours();
    counts[h] += 1;
  }
  return counts;
}

/** Revenue buckets by hour */
export function hourlyRevenue(
  orders: Pick<Order, "created_at" | "total" | "status">[],
) {
  const amounts = Array.from({ length: 24 }, () => 0);
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const h = new Date(order.created_at).getHours();
    amounts[h] += Number(order.total);
  }
  return amounts;
}

export function averageWaitMinutes(
  orders: Pick<Order, "created_at" | "updated_at" | "status">[],
) {
  const completed = orders.filter((o) => o.status === "completed");
  if (!completed.length) return null;
  const total = completed.reduce((sum, o) => {
    return (
      sum +
      Math.max(
        0,
        (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) /
          60000,
      )
    );
  }, 0);
  return Math.round(total / completed.length);
}
