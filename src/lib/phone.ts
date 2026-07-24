/** Normalize Sri Lankan / E.164 phone numbers for storage & auth. */
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

  // Sri Lanka mobiles are +94 + 9 digits starting with 7
  if (e164.startsWith("+94")) {
    const national = e164.slice(3);
    if (!/^7\d{8}$/.test(national)) return null;
  }

  return e164;
}

/**
 * Format for TextBee / Android SmsManager.
 * Domestic LK numbers deliver more reliably as 07XXXXXXXX than +94…
 */
export function toSmsRecipient(e164: string): string {
  if (e164.startsWith("+94") && e164.length === 12) {
    return `0${e164.slice(3)}`;
  }
  return e164;
}

export function phoneToAuthEmail(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@phone.kingsbakamuna.local`;
}

export function maskPhone(phone: string) {
  const sms = phone.startsWith("+") ? toSmsRecipient(phone) : phone;
  if (sms.length < 6) return sms;
  return `${sms.slice(0, 3)}••••${sms.slice(-3)}`;
}
