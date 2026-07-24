import { toSmsRecipient } from "@/lib/phone";

type TextBeeSendResponse = {
  data?: {
    success?: boolean;
    message?: string;
    smsBatchId?: string;
    recipientCount?: number;
  };
  message?: string;
  error?: string;
};

/** Send SMS via TextBee to the customer's mobile (Android gateway SIM). */
export async function sendTextBeeSms(recipients: string[], message: string) {
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  const apiKey = process.env.TEXTBEE_API_KEY;

  if (!deviceId || !apiKey) {
    throw new Error("TextBee is not configured");
  }

  // Always address the customer's handset number (local 07… for LK).
  const normalized = recipients.map((r) => {
    if (/^0\d{9}$/.test(r)) return r;
    if (r.startsWith("+")) return toSmsRecipient(r);
    const digits = r.replace(/\D/g, "");
    if (digits.startsWith("94") && digits.length === 11) {
      return toSmsRecipient(`+${digits}`);
    }
    if (digits.length === 9 && digits.startsWith("7")) {
      return toSmsRecipient(`+94${digits}`);
    }
    if (digits.startsWith("0") && digits.length === 10) {
      return digits;
    }
    return r;
  });

  const res = await fetch(
    `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ recipients: normalized, message }),
    },
  );

  const body = (await res.json().catch(() => null)) as TextBeeSendResponse | null;
  if (!res.ok) {
    const detail =
      body?.message ||
      body?.error ||
      body?.data?.message ||
      `TextBee error (${res.status})`;
    throw new Error(String(detail));
  }

  if (body?.data && body.data.success === false) {
    throw new Error(body.data.message || "TextBee did not accept the SMS");
  }

  return {
    batchId: body?.data?.smsBatchId ?? null,
    recipients: normalized,
    raw: body,
  };
}
