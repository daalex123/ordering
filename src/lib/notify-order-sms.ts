import type { OrderSmsEvent } from "@/lib/order-sms";

/** Fire-and-forget order SMS (does not throw; logs failures). */
export function notifyOrderSms(orderId: string, event: OrderSmsEvent) {
  void fetch("/api/orders/sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, event }),
  }).catch((err) => {
    console.error(`order sms ${event}`, err);
  });
}
