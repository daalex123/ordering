import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { generateOtpCode, hashOtp, otpExpiresAt } from "@/lib/otp";
import { sendTextBeeSms } from "@/lib/textbee";

export const runtime = "nodejs";

const RESEND_COOLDOWN_MS = 30_000;
const HOURLY_LIMIT = 10;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      phone?: string;
      purpose?: "signup";
    };
    const phone = normalizePhone(body.phone ?? "");
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid mobile number (e.g. 07XXXXXXXX)" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    if (body.purpose === "signup") {
      const { data: existingPhone } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (existingPhone?.id) {
        return NextResponse.json(
          {
            error:
              "This mobile number is already registered. Please log in.",
          },
          { status: 409 },
        );
      }
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("otp_challenges")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", since);

    if ((count ?? 0) >= HOURLY_LIMIT) {
      return NextResponse.json(
        {
          error: "Too many codes sent. Try again in an hour.",
          retryAfterSec: 3600,
        },
        { status: 429 },
      );
    }

    const { data: latest } = await admin
      .from("otp_challenges")
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.created_at) {
      const elapsed = Date.now() - new Date(latest.created_at).getTime();
      const waitMs = RESEND_COOLDOWN_MS - elapsed;
      if (waitMs > 0) {
        const retryAfterSec = Math.ceil(waitMs / 1000);
        return NextResponse.json(
          {
            error: `Please wait ${retryAfterSec}s before requesting another code.`,
            retryAfterSec,
          },
          { status: 429 },
        );
      }
    }

    // Invalidate previous unused codes for this phone
    await admin
      .from("otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("phone", phone)
      .is("consumed_at", null);

    const code = generateOtpCode();
    const codeHash = hashOtp(phone, code);
    const expiresAt = otpExpiresAt();

    const { data: inserted, error: insertError } = await admin
      .from("otp_challenges")
      .insert({
        phone,
        code_hash: codeHash,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("otp insert", insertError);
      return NextResponse.json(
        { error: "Could not start verification. Try again." },
        { status: 500 },
      );
    }

    try {
      const smsResult = await sendTextBeeSms(
        [phone],
        `Kings Bakamuna code: ${code}. Valid for 5 minutes.`,
      );

      return NextResponse.json({
        ok: true,
        phone,
        masked: maskPhone(phone),
        sentTo: smsResult.recipients[0],
        expiresInSec: 300,
        resendAfterSec: Math.ceil(RESEND_COOLDOWN_MS / 1000),
      });
    } catch (smsErr) {
      await admin
        .from("otp_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", inserted.id);
      throw smsErr;
    }
  } catch (err) {
    console.error("otp send", err);
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
