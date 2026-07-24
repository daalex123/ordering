/** Normalize Sri Lankan / E.164 phone numbers for TextBee. */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let e164: string;
  if (raw.startsWith("+")) {
    e164 = `+${digits}`;
  } else if (digits.startsWith("94") && digits.length >= 11) {
    e164 = `+${digits}`;
  } else if (digits.startsWith("0") && digits.length === 10) {
    e164 = `+94${digits.slice(1)}`;
  } else if (digits.length === 9 && digits.startsWith("7")) {
    e164 = `+94${digits}`;
  } else if (digits.length >= 10 && digits.length <= 15) {
    e164 = `+${digits}`;
  } else {
    return null;
  }

  // E.164: + and 8–15 digits
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  return e164;
}

export function phoneToAuthEmail(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@phone.kingsbakamuna.local`;
}

export function maskPhone(phone: string) {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 4)}••••${phone.slice(-3)}`;
}
