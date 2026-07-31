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
    <div className="px-5 pb-6">
      <ClearOrderNotification orderId={order.id} status={order.status} />
      <CustomerPageHeader
        title="Order Details"
        backHref="/orders"
        className="px-0"
      />

      <div className="space-y-4">
        <p className="px-1 text-[13px] text-white/55">
          {format(new Date(order.created_at), "MMM d, yyyy · h:mm a")}
        </p>

        <div className="glass-panel-strong rounded-[28px] p-4">
          <OrderStatusTracker
            orderId={order.id}
            initialStatus={order.status}
            fulfillmentType={order.fulfillment_type}
          />
        </div>

        <div className="glass-panel space-y-2 rounded-[20px] p-4">
          <h2 className="text-[15px] font-semibold text-white">Items</h2>
          <ul className="space-y-2 text-[14px] text-white/80">
            {order.order_items.map((item: OrderItem) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  {item.quantity}× {item.product_name}
                  {item.notes ? (
                    <span className="block text-[12px] text-white/45">
                      {item.notes}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-medium text-[var(--glass-accent)]">
                  {formatMoney(Number(item.unit_price) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-white/15 pt-2 text-[15px] font-semibold text-white">
            <span>Total</span>
            <span className="text-[var(--glass-accent)]">
              {formatMoney(Number(order.total))}
            </span>
          </div>
        </div>

        <div className="glass-panel space-y-1.5 rounded-[20px] p-4 text-[14px] text-white/80">
          <p className="capitalize">
            <span className="text-white/45">Fulfillment: </span>
            {order.fulfillment_type.replace("_", " ")}
          </p>
          <p>
            <span className="text-white/45">Phone: </span>
            {order.customer_phone}
          </p>
          {order.delivery_address ? (
            <p>
              <span className="text-white/45">Address: </span>
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
              <span className="text-white/45">Notes: </span>
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
            className="glass-panel rounded-[20px] py-3 text-center text-[14px] font-semibold text-white"
          >
            Back to orders
          </Link>
        </div>
      </div>
    </div>
  );
}
