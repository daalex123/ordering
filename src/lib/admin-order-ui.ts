import type { OrderStatus } from "@/types/database";

export const ORDER_STATUS_STYLES: Record<
  OrderStatus,
  { badge: string; soft: string; dot: string }
> = {
  pending: {
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    soft: "bg-amber-50 border-amber-200/80",
    dot: "bg-amber-500",
  },
  confirmed: {
    badge: "bg-sky-100 text-sky-900 border-sky-200",
    soft: "bg-sky-50 border-sky-200/80",
    dot: "bg-sky-500",
  },
  preparing: {
    badge: "bg-orange-100 text-orange-900 border-orange-200",
    soft: "bg-orange-50 border-orange-200/80",
    dot: "bg-orange-500",
  },
  ready: {
    badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
    soft: "bg-emerald-50 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  out_for_delivery: {
    badge: "bg-violet-100 text-violet-900 border-violet-200",
    soft: "bg-violet-50 border-violet-200/80",
    dot: "bg-violet-500",
  },
  completed: {
    badge: "bg-zinc-100 text-zinc-700 border-zinc-200",
    soft: "bg-zinc-50 border-zinc-200/80",
    dot: "bg-zinc-400",
  },
  cancelled: {
    badge: "bg-red-100 text-red-800 border-red-200",
    soft: "bg-red-50 border-red-200/80",
    dot: "bg-red-500",
  },
};

export function orderTicketLabel(
  order: { order_number?: number | null; id: string },
) {
  if (order.order_number != null) {
    return String(order.order_number);
  }
  // Fallback for any stale client cache before order_number is present
  return order.id.replace(/-/g, "").slice(-4).toUpperCase();
}

/** @deprecated Prefer orderTicketLabel(order) */
export function orderShortId(id: string) {
  return id.replace(/-/g, "").slice(-4).toUpperCase();
}
