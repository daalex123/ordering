import type { FulfillmentType, OrderStatus } from "@/types/database";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/types/database";

/** Status path for a given fulfillment type (pickup skips delivery). */
export function statusFlowFor(
  fulfillment: FulfillmentType,
): OrderStatus[] {
  if (fulfillment === "pickup") {
    return ORDER_STATUS_FLOW.filter((s) => s !== "out_for_delivery");
  }
  return [...ORDER_STATUS_FLOW];
}

export function nextStatusFor(
  status: OrderStatus,
  fulfillment: FulfillmentType,
): OrderStatus | null {
  const flow = statusFlowFor(fulfillment);
  const idx = flow.indexOf(status);
  if (idx < 0 || idx >= flow.length - 1) return null;
  return flow[idx + 1] ?? null;
}

export function advanceLabel(
  status: OrderStatus,
  fulfillment: FulfillmentType,
): string | null {
  const next = nextStatusFor(status, fulfillment);
  if (!next) return null;
  const map: Partial<Record<OrderStatus, string>> = {
    confirmed: "Confirm",
    preparing: "Start prep",
    ready: "Mark ready",
    out_for_delivery: "Send out",
    completed: fulfillment === "pickup" ? "Complete" : "Delivered",
  };
  return map[next] ?? `→ ${ORDER_STATUS_LABELS[next]}`;
}

export function formatAddress(address: {
  line1: string;
  line2?: string;
  city: string;
} | null) {
  if (!address) return null;
  return [address.line1, address.line2, address.city].filter(Boolean).join(", ");
}
