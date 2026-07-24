import { createHash, randomInt, timingSafeEqual } from "crypto";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function pepper() {
  return process.env.OTP_PEPPER || process.env.TEXTBEE_API_KEY || "dev-pepper";
}

export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(phone: string, code: string) {
  return createHash("sha256")
    .update(`${pepper()}:${phone}:${code}`)
    .digest("hex");
}

export function otpMatches(phone: string, code: string, codeHash: string) {
  const a = Buffer.from(hashOtp(phone, code), "hex");
  const b = Buffer.from(codeHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function otpExpiresAt(from = new Date()) {
  return new Date(from.getTime() + OTP_TTL_MS);
}

export { OTP_TTL_MS, MAX_ATTEMPTS };
