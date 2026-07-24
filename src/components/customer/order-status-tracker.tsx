"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/types/database";
import { cn } from "@/lib/utils";

const steps: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
];

export function OrderStatusTracker({
  orderId,
  initialStatus,
  fulfillmentType,
}: {
  orderId: string;
  initialStatus: OrderStatus;
  fulfillmentType: Order["fulfillment_type"];
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const next = payload.new as Order;
          setStatus(next.status);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (status === "cancelled") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }

  const visibleSteps =
    fulfillmentType === "pickup"
      ? steps.filter((s) => s !== "out_for_delivery")
      : steps;

  const currentIndex = visibleSteps.indexOf(status);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Status</p>
        <Badge>{ORDER_STATUS_LABELS[status]}</Badge>
      </div>
      <ol className="space-y-2">
        {visibleSteps.map((step, index) => (
          <li key={step} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                index <= currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                index <= currentIndex
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {ORDER_STATUS_LABELS[step]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
