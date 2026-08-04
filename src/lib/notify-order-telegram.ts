import type { OrderTelegramEvent } from "@/lib/order-telegram";

/** Fire-and-forget order Telegram alert (does not throw; logs failures). */
export function notifyOrderTelegram(
  orderId: string,
  event: OrderTelegramEvent,
) {
  void fetch("/api/orders/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, event }),
  }).catch((err) => {
    console.error(`order telegram ${event}`, err);
  });
}
