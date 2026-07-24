import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatMoney,
  ORDER_STATUS_LABELS,
  type Order,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/orders");

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Your orders</h1>
      {orders.length === 0 ? (
        <div className="space-y-3 py-12 text-center">
          <p className="text-muted-foreground">No orders yet</p>
          <Link href="/" className={cn(buttonVariants())}>
            Order something
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="block rounded-xl border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {format(new Date(order.created_at), "MMM d, h:mm a")}
                    </p>
                    <p className="text-sm capitalize text-muted-foreground">
                      {order.fulfillment_type.replace("_", " ")} ·{" "}
                      {formatMoney(Number(order.total))}
                    </p>
                  </div>
                  <Badge
                    variant={
                      order.status === "cancelled" ? "destructive" : "secondary"
                    }
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
