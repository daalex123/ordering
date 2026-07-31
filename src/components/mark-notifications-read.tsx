"use client";

import { useEffect } from "react";
import {
  useNotifications,
  type NotificationScope,
} from "@/lib/notification-store";

/** Clears unread badge when the related list page is opened. */
export function MarkNotificationsRead({
  scope,
}: {
  scope: NotificationScope;
}) {
  const markAllRead = useNotifications((s) => s.markAllRead);

  useEffect(() => {
    markAllRead(scope);
  }, [markAllRead, scope]);

  return null;
}
