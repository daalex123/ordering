import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatMoney,
  type OrderItem,
  type OrderWithItems,
} from "@/types/database";
import { OrderStatusTracker } from "@/components/customer/order-status-tracker";
import { CancelOrderButton } from "@/components/customer/cancel-order-button";
import { ReorderButton } from "@/components/customer/reorder-button";
import { format } from "date-fns";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";
import { ClearOrderNotification } from "@/components/clear-order-notification";

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
    <div>
      <ClearOrderNotification orderId={order.id} status={order.status} />
      <CustomerPageHeader title="Order Details" backHref="/orders" />
      <div className="-mt-4 space-y-4 rounded-t-[30px] bg-white px-5 pt-6 pb-8">
        <p className="text-sm text-muted-foreground">
          {format(new Date(order.created_at), "MMM d, yyyy · h:mm a")}
        </p>

        <div className="rounded-[24px] bg-[var(--yum-peach)]/40 p-4">
          <OrderStatusTracker
            orderId={order.id}
            initialStatus={order.status}
            fulfillmentType={order.fulfillment_type}
          />
        </div>

        <div className="space-y-2 rounded-[24px] bg-[var(--yum-sheet)] p-4">
          <h2 className="font-semibold text-[var(--yum-ink)]">Items</h2>
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
                <span className="shrink-0 font-medium text-primary">
                  {formatMoney(Number(item.unit_price) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-[#FFD8C7] pt-2 font-semibold">
            <span>Total</span>
            <span className="text-primary">
              {formatMoney(Number(order.total))}
            </span>
          </div>
        </div>

        <div className="rounded-[24px] bg-[var(--yum-cream)]/60 p-4 text-sm">
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
          <Link
            href="/orders"
            className="rounded-full border border-primary py-3 text-center text-sm font-semibold text-primary"
          >
            Back to orders
          </Link>
        </div>
      </div>
    </div>
  );
}
