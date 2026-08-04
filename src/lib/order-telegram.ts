import { createAdminClient } from "@/lib/supabase/admin";
import { orderTicketLabel } from "@/lib/admin-order-ui";
import { appBaseUrl } from "@/lib/order-sms";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatMoney, type Order } from "@/types/database";

export type OrderTelegramEvent =
  | "placed"
  | "confirmed"
  | "cancelled"
  | "completed";

const TELEGRAM_EVENTS = new Set<OrderTelegramEvent>([
  "placed",
  "confirmed",
  "cancelled",
  "completed",
]);

export function isOrderTelegramEvent(
  value: unknown,
): value is OrderTelegramEvent {
  return (
    typeof value === "string" &&
    TELEGRAM_EVENTS.has(value as OrderTelegramEvent)
  );
}

type TelegramSettings = {
  telegram_chat_id: string | null;
  telegram_alerts_enabled: boolean;
  name: string | null;
};

async function loadTelegramSettings(): Promise<TelegramSettings | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurant_settings")
    .select("telegram_chat_id, telegram_alerts_enabled, name")
    .limit(1)
    .maybeSingle();
  return (data as TelegramSettings | null) ?? null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatOrderTelegramMessage(
  order: Order,
  event: OrderTelegramEvent,
  restaurantName: string,
): string {
  const ticket = escapeHtml(orderTicketLabel(order));
  const who = escapeHtml(
    order.customer_name?.trim() || order.customer_phone || "Customer",
  );
  const type =
    order.fulfillment_type === "delivery" ? "Delivery" : "Pickup";
  const total = escapeHtml(formatMoney(Number(order.total)));
  const brand = escapeHtml(restaurantName.trim() || "Restaurant");
  const adminUrl = `${appBaseUrl()}/admin/orders`;

  switch (event) {
    case "placed":
      return (
        `🆕 <b>New order #${ticket}</b>\n` +
        `${who} · ${type} · ${total}\n` +
        `<i>${brand}</i>\n` +
        `<a href="${adminUrl}">Open admin</a>`
      );
    case "confirmed":
      return `✅ <b>Confirmed #${ticket}</b> · ${who}`;
    case "cancelled":
      return `❌ <b>Cancelled #${ticket}</b> · ${who} · ${type}`;
    case "completed":
      return `✔️ <b>Completed #${ticket}</b> · ${who} · ${total}`;
  }
}

export async function sendOrderTelegram(
  order: Order,
  event: OrderTelegramEvent,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const settings = await loadTelegramSettings();
  if (!settings?.telegram_alerts_enabled || !settings.telegram_chat_id) {
    return { ok: false, skipped: true, error: "not_connected" };
  }

  const text = formatOrderTelegramMessage(
    order,
    event,
    settings.name ?? "Restaurant",
  );
  return sendTelegramMessage(settings.telegram_chat_id, text);
}

/** Load order by id then send (safe fire-and-forget from server routes). */
export async function sendOrderTelegramById(
  orderId: string,
  event: OrderTelegramEvent,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    console.error("order telegram load", error);
    return { ok: false, error: "order_not_found" };
  }

  return sendOrderTelegram(data as Order, event);
}
