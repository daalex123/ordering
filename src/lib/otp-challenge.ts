import { createAdminClient } from "@/lib/supabase/admin";
import { maskPhone } from "@/lib/phone";
import {
  generateOtpCode,
  hashOtp,
  otpExpiresAt,
  otpMatches,
  MAX_ATTEMPTS,
} from "@/lib/otp";
import { sendTextBeeSms } from "@/lib/textbee";

export type OtpPurpose = "auth" | "order";

const RESEND_COOLDOWN_MS = 30_000;
const HOURLY_LIMIT = 10;

export type SendOtpResult =
  | {
      ok: true;
      phone: string;
      masked: string;
      sentTo: string;
      expiresInSec: number;
      resendAfterSec: number;
    }
  | {
      ok: false;
      error: string;
      status: number;
      retryAfterSec?: number;
    };

export type VerifyOtpResult =
  | { ok: true; challengeId: string }
  | { ok: false; error: string; status: number };

export async function sendOtpChallenge(params: {
  phone: string;
  purpose: OtpPurpose;
  message: (code: string) => string;
}): Promise<SendOtpResult> {
  const { phone, purpose, message } = params;
  const admin = createAdminClient();

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("otp_challenges")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .eq("purpose", purpose)
    .gte("created_at", since);

  if ((count ?? 0) >= HOURLY_LIMIT) {
    return {
      ok: false,
      error: "Too many codes sent. Try again in an hour.",
      status: 429,
      retryAfterSec: 3600,
    };
  }

  const { data: latest } = await admin
    .from("otp_challenges")
    .select("created_at")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.created_at) {
    const elapsed = Date.now() - new Date(latest.created_at).getTime();
    const waitMs = RESEND_COOLDOWN_MS - elapsed;
    if (waitMs > 0) {
      const retryAfterSec = Math.ceil(waitMs / 1000);
      return {
        ok: false,
        error: `Please wait ${retryAfterSec}s before requesting another code.`,
        status: 429,
        retryAfterSec,
      };
    }
  }

  await admin
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  const code = generateOtpCode();
  const codeHash = hashOtp(phone, code);
  const expiresAt = otpExpiresAt();

  const { data: inserted, error: insertError } = await admin
    .from("otp_challenges")
    .insert({
      phone,
      purpose,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("otp insert", insertError);
    return {
      ok: false,
      error: "Could not start verification. Try again.",
      status: 500,
    };
  }

  try {
    const smsResult = await sendTextBeeSms([phone], message(code));
    return {
      ok: true,
      phone,
      masked: maskPhone(phone),
      sentTo: smsResult.recipients[0],
      expiresInSec: 300,
      resendAfterSec: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    };
  } catch (smsErr) {
    await admin
      .from("otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", inserted.id);
    throw smsErr;
  }
}

/** Verify and consume an active OTP challenge for the given purpose. */
export async function verifyAndConsumeOtp(params: {
  phone: string;
  code: string;
  purpose: OtpPurpose;
}): Promise<VerifyOtpResult> {
  const { phone, code, purpose } = params;
  const admin = createAdminClient();

  const { data: challenge, error: challengeError } = await admin
    .from("otp_challenges")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (challengeError || !challenge) {
    return {
      ok: false,
      error: "No active code. Request a new one.",
      status: 400,
    };
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      error: "Code expired. Request a new one.",
      status: 400,
    };
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      error: "Too many attempts. Request a new code.",
      status: 429,
    };
  }

  if (!otpMatches(phone, code, challenge.code_hash)) {
    await admin
      .from("otp_challenges")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challenge.id);
    return { ok: false, error: "Incorrect code", status: 400 };
  }

  await admin
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id);

  return { ok: true, challengeId: challenge.id };
}

export { RESEND_COOLDOWN_MS, HOURLY_LIMIT };
