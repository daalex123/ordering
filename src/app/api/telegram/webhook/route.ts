import { NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegram-connect";
import {
  isTelegramWebhookAuthorized,
  type TelegramUpdate,
} from "@/lib/telegram";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isTelegramWebhookAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = (await req.json()) as TelegramUpdate;
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error("telegram webhook", err);
  }

  // Always 200 so Telegram does not retry aggressively on app errors
  return NextResponse.json({ ok: true });
}
