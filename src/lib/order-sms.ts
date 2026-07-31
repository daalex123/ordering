import { createAdminClient } from "@/lib/supabase/admin";
import { orderTicketLabel } from "@/lib/admin-order-ui";
import { normalizePhone } from "@/lib/phone";
import { sendTextBeeSms } from "@/lib/textbee";
import { formatMoney, type Order } from "@/types/database";

export type OrderSmsEvent = "placed" | "completed";

function dedupePhones(phones: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of phones) {
    if (!raw?.trim()) continue;
    const normalized = normalizePhone(raw) ?? raw.trim();
    const key = normalized.replace(/\D/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function envAdminPhones(): string[] {
  const raw = process.env.ADMIN_SMS_PHONES ?? "";
  return raw
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Admin / staff mobiles + restaurant phone + optional ADMIN_SMS_PHONES. */
export async function resolveAdminSmsPhones(): Promise<string[]> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: settings }] = await Promise.all([
    admin
      .from("profiles")
      .select("phone")
      .in("role", ["admin", "staff"])
      .not("phone", "is", null),
    admin.from("restaurant_settings").select("phone").limit(1).maybeSingle(),
  ]);

  return dedupePhones([
    ...(profiles ?? []).map((p) => p.phone as string | null),
    settings?.phone,
    ...envAdminPhones(),
  ]);
}

async function restaurantLabel(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurant_settings")
    .select("name")
    .limit(1)
    .maybeSingle();
  return (data?.name as string | undefined)?.trim() || "Kings Bakamuna";
}

export function placedSmsMessage(order: Order, restaurantName: string): string {
  const ticket = orderTicketLabel(order);
  const who = order.customer_name?.trim() || order.customer_phone;
  const type = order.fulfillment_type === "delivery" ? "Delivery" : "Pickup";
  return `${restaurantName}: New order #${ticket} · ${who} · ${type} · ${formatMoney(Number(order.total))}. Open admin to confirm.`;
}

export function completedSmsMessage(
  order: Order,
  restaurantName: string,
): string {
  const ticket = orderTicketLabel(order);
  const type = order.fulfillment_type === "delivery" ? "delivered" : "ready";
  return `${restaurantName}: Your order #${ticket} is ${type}. Thank you!`;
}

export async function sendOrderPlacedSms(order: Order) {
  const [phones, name] = await Promise.all([
    resolveAdminSmsPhones(),
    restaurantLabel(),
  ]);
  if (!phones.length) {
    return { sent: false, reason: "no_admin_phones" as const, recipients: [] };
  }
  const message = placedSmsMessage(order, name);
  const result = await sendTextBeeSms(phones, message);
  return {
    sent: true as const,
    recipients: result.recipients,
    batchId: result.batchId,
  };
}

export async function sendOrderCompletedSms(order: Order) {
  const phone = order.customer_phone?.trim();
  if (!phone) {
    return {
      sent: false,
      reason: "no_customer_phone" as const,
      recipients: [] as string[],
    };
  }
  const name = await restaurantLabel();
  const message = completedSmsMessage(order, name);
  const result = await sendTextBeeSms([phone], message);
  return {
    sent: true as const,
    recipients: result.recipients,
    batchId: result.batchId,
  };
}
