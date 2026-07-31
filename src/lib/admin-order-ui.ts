import type { OrderStatus } from "@/types/database";

/** DashStack-aligned status colors */
export const ORDER_STATUS_STYLES: Record<
  OrderStatus,
  { badge: string; soft: string; dot: string }
> = {
  pending: {
    badge: "bg-[#fcbe2d] text-white border-transparent",
    soft: "bg-[#fcbe2d]/10 border-[#fcbe2d]/30",
    dot: "bg-white",
  },
  confirmed: {
    badge: "bg-[#4880ff] text-white border-transparent",
    soft: "bg-[#4880ff]/10 border-[#4880ff]/30",
    dot: "bg-white",
  },
  preparing: {
    badge: "bg-[#8280ff] text-white border-transparent",
    soft: "bg-[#8280ff]/10 border-[#8280ff]/30",
    dot: "bg-white",
  },
  ready: {
    badge: "bg-[#00b69b] text-white border-transparent",
    soft: "bg-[#00b69b]/10 border-[#00b69b]/30",
    dot: "bg-white",
  },
  out_for_delivery: {
    badge: "bg-[#4ad991] text-white border-transparent",
    soft: "bg-[#4ad991]/10 border-[#4ad991]/30",
    dot: "bg-white",
  },
  completed: {
    badge: "bg-[#00b69b] text-white border-transparent",
    soft: "bg-[#f1f4f9] border-[#e0e2e7]",
    dot: "bg-white",
  },
  cancelled: {
    badge: "bg-[#fd5454] text-white border-transparent",
    soft: "bg-[#fd5454]/10 border-[#fd5454]/30",
    dot: "bg-white",
  },
};

export function orderTicketLabel(
  order: { order_number?: number | null; id: string },
) {
  if (order.order_number != null) {
    return String(order.order_number);
  }
  return order.id.replace(/-/g, "").slice(-4).toUpperCase();
}

/** @deprecated Prefer orderTicketLabel(order) */
export function orderShortId(id: string) {
  return id.replace(/-/g, "").slice(-4).toUpperCase();
}
