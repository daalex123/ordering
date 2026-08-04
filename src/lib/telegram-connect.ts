import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getTelegramUpdates,
  sendTelegramMessage,
  telegramBotToken,
  telegramBotUsername,
  type TelegramUpdate,
} from "@/lib/telegram";

export function isStaffRole(role: string | null | undefined) {
  return role === "admin" || role === "staff";
}

export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isStaffRole(profile?.role as string | undefined)) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  return { user, supabase };
}

export type TelegramConnectionStatus = {
  configured: boolean;
  botUsername: string | null;
  connected: boolean;
  pending: boolean;
  channelTitle: string | null;
  chatIdMasked: string | null;
  deepLink: string | null;
};

function maskChatId(chatId: string | null | undefined): string | null {
  if (!chatId) return null;
  if (chatId.length <= 6) return "***";
  return `${chatId.slice(0, 4)}…${chatId.slice(-3)}`;
}

export async function getTelegramConnectionStatus(): Promise<TelegramConnectionStatus> {
  const botUsername = telegramBotUsername();
  const configured = Boolean(telegramBotToken() && botUsername);

  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurant_settings")
    .select(
      "telegram_chat_id, telegram_alerts_enabled, telegram_link_code, telegram_link_expires_at, telegram_channel_title",
    )
    .limit(1)
    .maybeSingle();

  const pending =
    Boolean(data?.telegram_link_code) &&
    data?.telegram_link_expires_at != null &&
    new Date(data.telegram_link_expires_at as string).getTime() > Date.now() &&
    !data?.telegram_alerts_enabled;

  const deepLink =
    pending && botUsername && data?.telegram_link_code
      ? `https://t.me/${botUsername}?start=link_${data.telegram_link_code}`
      : null;

  return {
    configured,
    botUsername,
    connected: Boolean(
      data?.telegram_alerts_enabled && data?.telegram_chat_id,
    ),
    pending,
    channelTitle: (data?.telegram_channel_title as string | null) ?? null,
    chatIdMasked: maskChatId(data?.telegram_chat_id as string | null),
    deepLink,
  };
}

export function newLinkCode(): string {
  return randomBytes(16).toString("hex");
}

export async function startTelegramLink(): Promise<{
  deepLink: string;
  expiresAt: string;
} | { error: string }> {
  const botUsername = telegramBotUsername();
  if (!telegramBotToken() || !botUsername) {
    return {
      error:
        "Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME.",
    };
  }

  const code = newLinkCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("restaurant_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!row?.id) {
    return { error: "Restaurant settings not found" };
  }

  const { error } = await admin
    .from("restaurant_settings")
    .update({
      telegram_link_code: code,
      telegram_link_expires_at: expiresAt,
      // Keep existing connection until a new channel is bound successfully
    })
    .eq("id", row.id);

  if (error) {
    return { error: error.message };
  }

  return {
    deepLink: `https://t.me/${botUsername}?start=link_${code}`,
    expiresAt,
  };
}

export async function cancelTelegramLink(): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("restaurant_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!row?.id) return { error: "Restaurant settings not found" };

  const { error } = await admin
    .from("restaurant_settings")
    .update({
      telegram_link_code: null,
      telegram_link_expires_at: null,
    })
    .eq("id", row.id);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function disconnectTelegram(): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("restaurant_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!row?.id) return { error: "Restaurant settings not found" };

  const { error } = await admin
    .from("restaurant_settings")
    .update({
      telegram_chat_id: null,
      telegram_alerts_enabled: false,
      telegram_channel_title: null,
      telegram_link_code: null,
      telegram_link_expires_at: null,
    })
    .eq("id", row.id);

  if (error) return { error: error.message };
  return { ok: true };
}

async function bindChannel(opts: {
  chatId: string;
  title: string | null;
  linkCode?: string | null;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("restaurant_settings")
    .select(
      "id, telegram_link_code, telegram_link_expires_at, telegram_alerts_enabled",
    )
    .limit(1)
    .maybeSingle();

  if (!row?.id) return false;

  const pendingCode = row.telegram_link_code as string | null;
  const expiresAt = row.telegram_link_expires_at as string | null;
  const pendingValid =
    Boolean(pendingCode) &&
    expiresAt != null &&
    new Date(expiresAt).getTime() > Date.now();

  // Only bind when a link session is active (or matching code provided).
  if (!pendingValid) return false;
  if (opts.linkCode && opts.linkCode !== pendingCode) return false;

  const { error } = await admin
    .from("restaurant_settings")
    .update({
      telegram_chat_id: opts.chatId,
      telegram_channel_title: opts.title,
      telegram_alerts_enabled: true,
      telegram_link_code: null,
      telegram_link_expires_at: null,
    })
    .eq("id", row.id);

  if (error) {
    console.error("telegram bind", error);
    return false;
  }

  const titleLabel = opts.title ? `“${opts.title}”` : "your channel";
  await sendTelegramMessage(
    opts.chatId,
    `✅ <b>Connected</b>\nOrder alerts will post here for ${titleLabel}.`,
  );
  return true;
}

function channelFromUpdate(
  update: TelegramUpdate,
): { chatId: string; title: string | null } | null {
  const member = update.my_chat_member;
  if (member) {
    const status = member.new_chat_member.status;
    const chat = member.chat;
    if (
      (chat.type === "channel" || chat.type === "supergroup") &&
      (status === "administrator" || status === "member")
    ) {
      return {
        chatId: String(chat.id),
        title: chat.title ?? null,
      };
    }
  }

  const post = update.channel_post;
  if (post?.chat?.type === "channel") {
    return {
      chatId: String(post.chat.id),
      title: post.chat.title ?? null,
    };
  }

  return null;
}

/** Handle a single Telegram update (webhook or polled). */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (message?.text?.startsWith("/start")) {
    const parts = message.text.trim().split(/\s+/);
    const payload = parts[1] ?? "";
    const chatId = message.chat.id;

    if (payload.startsWith("link_")) {
      const code = payload.slice("link_".length);
      const admin = createAdminClient();
      const { data: row } = await admin
        .from("restaurant_settings")
        .select("telegram_link_code, telegram_link_expires_at")
        .limit(1)
        .maybeSingle();

      const valid =
        row?.telegram_link_code === code &&
        row.telegram_link_expires_at != null &&
        new Date(row.telegram_link_expires_at as string).getTime() > Date.now();

      const botUsername = telegramBotUsername() ?? "the bot";
      if (!valid) {
        await sendTelegramMessage(
          chatId,
          "This connect link expired. Open Admin → Settings and tap <b>Connect Telegram channel</b> again.",
        );
        return;
      }

      await sendTelegramMessage(
        chatId,
        `Almost done.\n\n` +
          `1. Create a <b>private channel</b> (or open an existing one)\n` +
          `2. Channel info → Administrators → Add <b>@${botUsername}</b>\n` +
          `3. Allow <b>Post Messages</b>\n` +
          `4. Return to Admin and tap <b>Check connection</b>\n\n` +
          `When the bot is added, this channel will start receiving order alerts.`,
      );
      return;
    }

    await sendTelegramMessage(
      chatId,
      "This bot posts restaurant order alerts to a channel.\nConnect it from Admin → Settings in your ordering app.",
    );
    return;
  }

  const channel = channelFromUpdate(update);
  if (channel) {
    await bindChannel({
      chatId: channel.chatId,
      title: channel.title,
    });
  }
}

/** Poll getUpdates for a pending channel bind (local/dev fallback). */
export async function checkPendingTelegramBind(): Promise<{
  connected: boolean;
  channelTitle: string | null;
}> {
  const status = await getTelegramConnectionStatus();
  if (status.connected) {
    return { connected: true, channelTitle: status.channelTitle };
  }
  if (!status.pending) {
    return { connected: false, channelTitle: null };
  }

  try {
    const updates = await getTelegramUpdates();
    for (const update of updates) {
      await handleTelegramUpdate(update);
    }

    // Acknowledge updates so they are not re-delivered on next poll
    if (updates.length) {
      const last = updates[updates.length - 1]!;
      await getTelegramUpdates(last.update_id + 1);
    }
  } catch (err) {
    // getUpdates fails when a webhook is already set — rely on webhook bind + DB status
    console.warn("telegram check poll", err);
  }

  const next = await getTelegramConnectionStatus();
  return {
    connected: next.connected,
    channelTitle: next.channelTitle,
  };
}

export async function sendTelegramTestMessage(): Promise<
  { ok: true } | { error: string }
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurant_settings")
    .select("telegram_chat_id, telegram_alerts_enabled, name")
    .limit(1)
    .maybeSingle();

  if (!data?.telegram_alerts_enabled || !data.telegram_chat_id) {
    return { error: "Telegram channel is not connected" };
  }

  const name = (data.name as string | null)?.trim() || "Restaurant";
  const result = await sendTelegramMessage(
    data.telegram_chat_id as string,
    `🔔 <b>Test alert</b>\n${name} order notifications are working.`,
  );

  if (!result.ok) {
    return { error: result.error ?? "Failed to send test message" };
  }
  return { ok: true };
}
