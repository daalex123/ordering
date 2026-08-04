/** Low-level Telegram Bot API helpers (server-only). */

export function telegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export function telegramBotUsername(): string | null {
  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (!raw) return null;
  return raw.replace(/^@/, "");
}

export function telegramWebhookSecret(): string | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  return secret || null;
}

type TelegramApiResult<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};

async function telegramApi<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<TelegramApiResult<T>> {
  const token = telegramBotToken();
  if (!token) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN not configured" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  const data = (await res.json()) as TelegramApiResult<T>;
  return data;
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { disableLinkPreview?: boolean },
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = telegramBotToken();
  if (!token) {
    console.warn("telegram: TELEGRAM_BOT_TOKEN missing; skip send");
    return { ok: false, skipped: true, error: "not_configured" };
  }

  const data = await telegramApi<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: options?.disableLinkPreview ?? true,
  });

  if (!data.ok) {
    const err = data.description ?? "sendMessage failed";
    console.error("telegram sendMessage", err);
    return { ok: false, error: err };
  }
  return { ok: true };
}

export async function getTelegramChat(
  chatId: string | number,
): Promise<{ id: number; title?: string; type?: string } | null> {
  const data = await telegramApi<{
    id: number;
    title?: string;
    type?: string;
  }>("getChat", { chat_id: chatId });
  if (!data.ok || !data.result) return null;
  return data.result;
}

export type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string; title?: string };
  };
  my_chat_member?: {
    chat: { id: number; type: string; title?: string };
    new_chat_member: {
      status: string;
      user: { is_bot?: boolean; username?: string };
    };
  };
  channel_post?: {
    chat: { id: number; type: string; title?: string };
  };
};

export async function getTelegramUpdates(
  offset?: number,
): Promise<TelegramUpdate[]> {
  const data = await telegramApi<TelegramUpdate[]>("getUpdates", {
    offset,
    timeout: 0,
    allowed_updates: ["message", "my_chat_member", "channel_post"],
  });
  if (!data.ok) {
    // Common when webhook is active
    if (data.description?.includes("webhook")) {
      return [];
    }
    console.warn("telegram getUpdates", data.description);
    return [];
  }
  if (!Array.isArray(data.result)) return [];
  return data.result;
}

export function isTelegramWebhookAuthorized(req: Request): boolean {
  const expected = telegramWebhookSecret();
  if (!expected) {
    // If no secret configured, reject webhook posts (force secure setup).
    return false;
  }
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  return got === expected;
}
