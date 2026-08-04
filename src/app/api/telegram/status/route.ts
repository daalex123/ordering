import { NextResponse } from "next/server";
import {
  cancelTelegramLink,
  checkPendingTelegramBind,
  disconnectTelegram,
  getTelegramConnectionStatus,
  requireStaff,
  sendTelegramTestMessage,
} from "@/lib/telegram-connect";

export const runtime = "nodejs";

type Action = "check" | "test" | "disconnect" | "cancel";

export async function POST(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: Action };
  const action = body.action;

  if (
    action !== "check" &&
    action !== "test" &&
    action !== "disconnect" &&
    action !== "cancel"
  ) {
    return NextResponse.json(
      { error: "action must be check|test|disconnect|cancel" },
      { status: 400 },
    );
  }

  if (action === "check") {
    const result = await checkPendingTelegramBind();
    const status = await getTelegramConnectionStatus();
    return NextResponse.json({ ...status, ...result });
  }

  if (action === "test") {
    const result = await sendTelegramTestMessage();
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    const result = await cancelTelegramLink();
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const status = await getTelegramConnectionStatus();
    return NextResponse.json(status);
  }

  // disconnect
  const result = await disconnectTelegram();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const status = await getTelegramConnectionStatus();
  return NextResponse.json(status);
}
