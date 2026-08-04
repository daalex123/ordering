"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type TelegramStatus = {
  configured: boolean;
  botUsername: string | null;
  connected: boolean;
  pending: boolean;
  channelTitle: string | null;
  chatIdMasked: string | null;
  deepLink: string | null;
};

export function TelegramSettingsCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/telegram/connect");
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(data.error ?? "Could not load Telegram status");
      return;
    }
    setStatus((await res.json()) as TelegramStatus);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connect() {
    setBusy(true);
    try {
      const res = await fetch("/api/telegram/connect", { method: "POST" });
      const data = (await res.json()) as TelegramStatus & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not start connect");
        return;
      }
      setStatus(data);
      if (data.deepLink) {
        window.open(data.deepLink, "_blank", "noopener,noreferrer");
      }
      toast.success("Opened Telegram — add the bot to your channel");
    } finally {
      setBusy(false);
    }
  }

  async function action(actionName: "check" | "test" | "disconnect" | "cancel") {
    setBusy(true);
    try {
      const res = await fetch("/api/telegram/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      const data = (await res.json()) as TelegramStatus & {
        ok?: boolean;
        error?: string;
        connected?: boolean;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Request failed");
        return;
      }
      if (actionName === "test") {
        toast.success("Test message sent to the channel");
        await refresh();
        return;
      }
      if (actionName === "check") {
        if (data.connected) {
          toast.success(
            data.channelTitle
              ? `Connected to ${data.channelTitle}`
              : "Telegram channel connected",
          );
        } else {
          toast.message(
            "Not connected yet — add the bot as a channel admin, then try again",
          );
        }
      }
      if (actionName === "disconnect") {
        toast.success("Telegram disconnected");
      }
      setStatus(data as TelegramStatus);
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <div className="admin-panel h-28 animate-pulse rounded-xl" />
    );
  }

  return (
    <div className="admin-panel space-y-4 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Telegram alerts</h2>
            <p className="text-xs text-muted-foreground">
              Post new orders, confirmations, and cancellations to a private
              channel
            </p>
          </div>
        </div>
        {status.connected ? (
          <Badge variant="default">Connected</Badge>
        ) : status.pending ? (
          <Badge variant="secondary">Waiting</Badge>
        ) : (
          <Badge variant="outline">Off</Badge>
        )}
      </div>

      {!status.configured ? (
        <p className="text-sm text-muted-foreground">
          Platform bot not configured. Set{" "}
          <code className="text-xs">TELEGRAM_BOT_TOKEN</code> and{" "}
          <code className="text-xs">TELEGRAM_BOT_USERNAME</code> on the server,
          then reload this page.
        </p>
      ) : status.connected ? (
        <div className="space-y-3">
          <p className="text-sm">
            Alerts go to{" "}
            <span className="font-medium">
              {status.channelTitle ?? "your channel"}
            </span>
            {status.chatIdMasked ? (
              <span className="text-muted-foreground">
                {" "}
                ({status.chatIdMasked})
              </span>
            ) : null}
            {status.botUsername ? (
              <span className="text-muted-foreground">
                {" "}
                via @{status.botUsername}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void action("test")}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Send test message
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void action("disconnect")}
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : status.pending ? (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
            <li>Open the bot chat (link below) if it is not open yet</li>
            <li>Create a private Telegram channel (or use an existing one)</li>
            <li>
              Channel → Administrators → Add{" "}
              <span className="font-medium text-foreground">
                @{status.botUsername}
              </span>{" "}
              with <span className="font-medium text-foreground">Post Messages</span>
            </li>
            <li>Return here and tap Check connection</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {status.deepLink ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  window.open(status.deepLink!, "_blank", "noopener,noreferrer")
                }
              >
                Open bot
                <ExternalLink className="size-3.5" />
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={busy}
              onClick={() => void action("check")}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Check connection
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void action("cancel")}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            One click opens Telegram. Add the bot as a channel admin — no bot
            token or chat id needed.
          </p>
          <Button type="button" disabled={busy} onClick={() => void connect()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect Telegram channel
          </Button>
        </div>
      )}
    </div>
  );
}
