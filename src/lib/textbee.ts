export async function sendTextBeeSms(recipients: string[], message: string) {
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  const apiKey = process.env.TEXTBEE_API_KEY;

  if (!deviceId || !apiKey) {
    throw new Error("TextBee is not configured");
  }

  const res = await fetch(
    `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ recipients, message }),
    },
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `TextBee error (${res.status})`;
    throw new Error(detail);
  }

  return body;
}
