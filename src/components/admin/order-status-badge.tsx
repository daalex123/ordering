import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_STYLES } from "@/lib/admin-order-ui";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/database";

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const styles = ORDER_STATUS_STYLES[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto gap-1.5 border px-2.5 py-1 text-sm font-medium",
        styles.badge,
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", styles.dot)} aria-hidden />
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
