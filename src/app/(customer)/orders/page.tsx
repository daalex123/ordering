import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  formatMoney,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/types/database";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";
import { MarkNotificationsRead } from "@/components/mark-notifications-read";

const TABS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function tabForStatus(status: OrderStatus): TabId {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  return "active";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = (TABS.some((t) => t.id === params.tab)
    ? params.tab
    : "active") as TabId;

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

  const orders = ((data ?? []) as Order[]).filter(
    (o) => tabForStatus(o.status) === tab,
  );

  return (
    <div>
      <MarkNotificationsRead scope="customer" />
      <CustomerPageHeader title="My Orders" backHref="/" />
      <div className="-mt-4 rounded-t-[30px] bg-white px-5 pt-5 pb-8">
        <div className="mb-6 flex gap-2">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/orders?tab=${t.id}`}
              className={cn(
                "flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors",
                tab === t.id
                  ? "bg-primary text-white"
                  : "bg-[var(--yum-peach)] text-primary",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <ClipboardList
              className="size-24 stroke-[1] text-[var(--yum-peach)]"
              strokeWidth={1}
            />
            <p className="max-w-[220px] text-lg font-bold leading-snug text-primary">
              You don&apos;t have any {tab} orders at this time
            </p>
            <Link
              href="/"
              className="mt-2 rounded-full bg-[var(--yum-yellow)] px-8 py-3 text-sm font-semibold text-primary"
            >
              Order something
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="block rounded-[24px] bg-[var(--yum-peach)]/40 p-4 transition-colors hover:bg-[var(--yum-peach)]/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--yum-ink)]">
                        {format(new Date(order.created_at), "MMM d, h:mm a")}
                      </p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {order.fulfillment_type.replace("_", " ")} ·{" "}
                        {formatMoney(Number(order.total))}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
