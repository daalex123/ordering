import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatMoney,
  type OrderItem,
  type OrderWithItems,
} from "@/types/database";
import { OrderStatusTracker } from "@/components/customer/order-status-tracker";
import { buttonVariants } from "@/components/ui/button";
import { CancelOrderButton } from "@/components/customer/cancel-order-button";
import { ReorderButton } from "@/components/customer/reorder-button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/orders/${id}`);

  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const order = data as OrderWithItems;

  if (order.user_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || !["admin", "staff"].includes(profile.role)) {
      notFound();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), "MMM d, yyyy · h:mm a")}
          </p>
        </div>
        <Link
          href="/orders"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back
        </Link>
      </div>

      <div className="rounded-xl border p-4">
        <OrderStatusTracker
          orderId={order.id}
          initialStatus={order.status}
          fulfillmentType={order.fulfillment_type}
        />
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Items</h2>
        <ul className="space-y-2 text-sm">
          {order.order_items.map((item: OrderItem) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.quantity}× {item.product_name}
                {item.notes ? (
                  <span className="block text-xs text-muted-foreground">
                    {item.notes}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0">
                {formatMoney(Number(item.unit_price) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatMoney(Number(order.total))}</span>
        </div>
      </div>

      <div className="rounded-xl border p-4 text-sm">
        <p className="capitalize">
          <span className="text-muted-foreground">Fulfillment: </span>
          {order.fulfillment_type.replace("_", " ")}
        </p>
        <p>
          <span className="text-muted-foreground">Phone: </span>
          {order.customer_phone}
        </p>
        {order.delivery_address ? (
          <p>
            <span className="text-muted-foreground">Address: </span>
            {[
              order.delivery_address.line1,
              order.delivery_address.line2,
              order.delivery_address.city,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : null}
        {order.notes ? (
          <p>
            <span className="text-muted-foreground">Notes: </span>
            {order.notes}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <ReorderButton items={order.order_items} />
        {order.status === "pending" ? (
          <CancelOrderButton orderId={order.id} />
        ) : null}
      </div>
    </div>
  );
}
