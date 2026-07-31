"use client";

import { useEffect } from "react";
import {
  adminOrderNotificationId,
  customerCompletedNotificationId,
  useNotifications,
} from "@/lib/notification-store";
import type { OrderStatus } from "@/types/database";

/** Removes bell entries for an order once it is finished. */
export function ClearOrderNotification({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const remove = useNotifications((s) => s.remove);

  useEffect(() => {
    if (status !== "completed" && status !== "cancelled") return;
    remove(adminOrderNotificationId(orderId));
    remove(customerCompletedNotificationId(orderId));
  }, [orderId, status, remove]);

  return null;
}
