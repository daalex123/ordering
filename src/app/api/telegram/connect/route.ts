import { NextResponse } from "next/server";
import {
  getTelegramConnectionStatus,
  requireStaff,
  startTelegramLink,
} from "@/lib/telegram-connect";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireStaff();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const status = await getTelegramConnectionStatus();
  return NextResponse.json(status);
}

export async function POST() {
  const auth = await requireStaff();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await startTelegramLink();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const status = await getTelegramConnectionStatus();
  return NextResponse.json({ ...status, ...result });
}
