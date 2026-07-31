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
    <div className="px-5 pb-6">
      <MarkNotificationsRead scope="customer" />
      <CustomerPageHeader title="My Orders" backHref="/" className="px-0" />

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/orders?tab=${t.id}`}
            className={cn(
              "flex-1 rounded-full py-2.5 text-center text-[13px] font-semibold transition-colors",
              tab === t.id
                ? "bg-[var(--glass-accent)] text-white shadow-[0_6px_16px_rgba(255,138,0,0.35)]"
                : "glass-panel text-white/70",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel-strong flex flex-col items-center gap-4 rounded-[28px] px-6 py-16 text-center">
          <ClipboardList
            className="size-16 text-white/25"
            strokeWidth={1.25}
          />
          <p className="max-w-[220px] text-[18px] font-bold leading-snug text-white">
            You don&apos;t have any {tab} orders at this time
          </p>
          <Link
            href="/"
            className="glass-cta mt-1 inline-flex h-11 items-center rounded-[20px] px-8 text-[14px] font-semibold"
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
                className="glass-panel block rounded-[20px] p-4 transition hover:bg-white/12"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-white">
                      {format(new Date(order.created_at), "MMM d, h:mm a")}
                    </p>
                    <p className="mt-0.5 text-[13px] capitalize text-white/55">
                      {order.fulfillment_type.replace("_", " ")} ·{" "}
                      {formatMoney(Number(order.total))}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--glass-accent)] px-2.5 py-1 text-[11px] font-semibold text-white">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
