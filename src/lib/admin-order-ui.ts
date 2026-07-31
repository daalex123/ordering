import type { OrderStatus } from "@/types/database";

export const ORDER_STATUS_STYLES: Record<
  OrderStatus,
  { badge: string; soft: string; dot: string }
> = {
  pending: {
    badge: "bg-amber-50 text-amber-900 border-amber-200",
    soft: "bg-amber-50/80 border-amber-200/80",
    dot: "bg-amber-500",
  },
  confirmed: {
    badge: "bg-sky-50 text-sky-900 border-sky-200",
    soft: "bg-sky-50/80 border-sky-200/80",
    dot: "bg-sky-500",
  },
  preparing: {
    badge: "bg-teal-50 text-teal-900 border-teal-200",
    soft: "bg-teal-50/80 border-teal-200/80",
    dot: "bg-teal-600",
  },
  ready: {
    badge: "bg-emerald-50 text-emerald-900 border-emerald-200",
    soft: "bg-emerald-50/80 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  out_for_delivery: {
    badge: "bg-cyan-50 text-cyan-950 border-cyan-200",
    soft: "bg-cyan-50/80 border-cyan-200/80",
    dot: "bg-cyan-600",
  },
  completed: {
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    soft: "bg-slate-50/80 border-slate-200/80",
    dot: "bg-slate-400",
  },
  cancelled: {
    badge: "bg-red-50 text-red-800 border-red-200",
    soft: "bg-red-50/80 border-red-200/80",
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
