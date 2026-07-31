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
        "h-auto gap-1.5 border px-3 py-1 text-sm font-bold rounded-[13.5px]",
        styles.badge,
        className,
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
