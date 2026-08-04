import type { Address, Order, OrderStatus, Profile } from "@/types/database";

export type CustomerOrderLite = Pick<
  Order,
  "id" | "user_id" | "status" | "total" | "created_at" | "fulfillment_type"
>;

export type CustomerRow = Profile & {
  order_count: number;
  completed_count: number;
  cancelled_count: number;
  total_spent: number;
  last_order_at: string | null;
};

export function buildCustomerRows(
  profiles: Profile[],
  orders: CustomerOrderLite[],
): CustomerRow[] {
  const byUser = new Map<string, CustomerOrderLite[]>();
  for (const order of orders) {
    const list = byUser.get(order.user_id);
    if (list) list.push(order);
    else byUser.set(order.user_id, [order]);
  }

  return profiles.map((profile) => {
    const userOrders = byUser.get(profile.id) ?? [];
    let totalSpent = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let lastOrderAt: string | null = null;

    for (const order of userOrders) {
      if (order.status === "completed") {
        completedCount += 1;
        totalSpent += Number(order.total);
      }
      if (order.status === "cancelled") cancelledCount += 1;
      if (!lastOrderAt || order.created_at > lastOrderAt) {
        lastOrderAt = order.created_at;
      }
    }

    return {
      ...profile,
      order_count: userOrders.length,
      completed_count: completedCount,
      cancelled_count: cancelledCount,
      total_spent: totalSpent,
      last_order_at: lastOrderAt,
    };
  });
}

export function customerDisplayName(profile: {
  full_name: string | null;
  phone: string | null;
}) {
  const name = profile.full_name?.trim();
  if (name) return name;
  return profile.phone?.trim() || "Customer";
}

export function formatCustomerAddress(address: Address | null) {
  if (!address) return null;
  return [address.line1, address.line2, address.city, address.notes]
    .filter(Boolean)
    .join(", ");
}

export function isActiveOrderStatus(status: OrderStatus) {
  return status !== "completed" && status !== "cancelled";
}
