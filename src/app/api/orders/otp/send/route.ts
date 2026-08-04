import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { sendOtpChallenge } from "@/lib/otp-challenge";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { phone?: string };
    const phone = normalizePhone(body.phone ?? "");
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid mobile number (e.g. 07XXXXXXXX)" },
        { status: 400 },
      );
    }

    const result = await sendOtpChallenge({
      phone,
      purpose: "order",
      message: (code) =>
        `Your Kings Bakamuna order code: ${code}. Valid for 5 minutes.`,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.retryAfterSec != null
            ? { retryAfterSec: result.retryAfterSec }
            : {}),
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      phone: result.phone,
      masked: result.masked,
      sentTo: result.sentTo,
      expiresInSec: result.expiresInSec,
      resendAfterSec: result.resendAfterSec,
    });
  } catch (err) {
    console.error("order otp send", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to send SMS. Please try again.",
      },
      { status: 500 },
    );
  }
}
