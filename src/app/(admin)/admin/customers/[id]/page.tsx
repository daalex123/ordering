"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bike,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { orderTicketLabel } from "@/lib/admin-order-ui";
import {
  customerDisplayName,
  formatCustomerAddress,
  isActiveOrderStatus,
} from "@/lib/admin-customers";
import {
  formatMoney,
  type OrderWithItems,
  type Profile,
} from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!id) return;
      if (!opts?.soft) setLoading(true);
      else setRefreshing(true);
      const supabase = createClient();
      const [profileRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      setLoading(false);
      setRefreshing(false);

      if (profileRes.error) {
        toast.error(profileRes.error.message);
        return;
      }
      if (!profileRes.data || profileRes.data.role !== "customer") {
        setNotFound(true);
        setProfile(null);
        setOrders([]);
        return;
      }
      setNotFound(false);
      setProfile(profileRes.data as Profile);

      if (ordersRes.error) {
        toast.error(ordersRes.error.message);
        return;
      }
      setOrders((ordersRes.data ?? []) as OrderWithItems[]);
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let spent = 0;
    let completed = 0;
    let cancelled = 0;
    let active = 0;
    for (const order of orders) {
      if (order.status === "completed") {
        completed += 1;
        spent += Number(order.total);
      } else if (order.status === "cancelled") {
        cancelled += 1;
      } else if (isActiveOrderStatus(order.status)) {
        active += 1;
      }
    }
    return {
      total: orders.length,
      completed,
      cancelled,
      active,
      spent,
    };
  }, [orders]);

  const address = profile
    ? formatCustomerAddress(profile.default_address)
    : null;

  if (!loading && notFound) {
    return (
      <div className="space-y-5">
        <AdminPageHeader
          title="Customer not found"
          description="This profile doesn’t exist or isn’t a customer account"
          actions={
            <Button variant="outline" size="sm" render={<Link href="/admin/customers" />}>
              <ArrowLeft className="size-3.5" />
              Back to customers
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={
          loading
            ? "Customer"
            : profile
              ? customerDisplayName(profile)
              : "Customer"
        }
        description="Profile, default address, and order history"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/admin/customers" />}
            >
              <ArrowLeft className="size-3.5" />
              Customers
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing || loading}
              onClick={() => void load({ soft: true })}
            >
              <RefreshCw
                className={cn("size-3.5", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <div className="admin-panel p-5">
            {loading || !profile ? (
              <div className="space-y-3">
                <div className="h-12 w-12 animate-pulse rounded-full bg-[#f1f4f9]" />
                <div className="h-5 w-40 animate-pulse rounded bg-[#f1f4f9]" />
                <div className="h-4 w-28 animate-pulse rounded bg-[#f1f4f9]" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#4880ff]">
                    <User className="size-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-[#202224]">
                      {customerDisplayName(profile)}
                    </p>
                    <p className="text-xs text-[#606060]">
                      Joined{" "}
                      {format(new Date(profile.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-[#f1f4f9] pt-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-[#606060] uppercase">
                      Phone
                    </p>
                    {profile.phone ? (
                      <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-[#202224]">
                        <Phone className="size-3.5 text-[#606060]" />
                        {profile.phone}
                      </p>
                    ) : (
                      <p className="mt-1 text-[#606060]">Not set</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-[#606060] uppercase">
                      Default address
                    </p>
                    {address ? (
                      <p className="mt-1 inline-flex items-start gap-1.5 font-semibold text-[#202224]">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#606060]" />
                        <span>{address}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[#606060]">No saved address</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Orders"
              value={loading ? "…" : String(stats.total)}
              icon={ShoppingBag}
            />
            <StatTile
              label="Active"
              value={loading ? "…" : String(stats.active)}
              icon={Package}
            />
            <StatTile
              label="Completed"
              value={loading ? "…" : String(stats.completed)}
              icon={Package}
            />
            <StatTile
              label="Spent"
              value={loading ? "…" : formatMoney(stats.spent)}
              icon={ShoppingBag}
            />
          </div>
        </div>

        <div className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-[#f1f4f9] px-4 py-3">
            <p className="text-sm font-semibold text-[#202224]">Order history</p>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/admin/orders/list" />}
            >
              All orders
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-[#f1f4f9] text-left">
                  {["Ticket", "When", "Type", "Total", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 font-bold text-[#202224]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-9 animate-pulse rounded-lg bg-[#f1f4f9]" />
                      </td>
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-[#606060]"
                    >
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const itemCount = order.order_items.reduce(
                      (s, i) => s + i.quantity,
                      0,
                    );
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[#f1f4f9] align-top"
                      >
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-[#202224]">
                            #{orderTicketLabel(order)}
                          </p>
                          <p className="text-xs text-[#606060]">
                            {itemCount} item{itemCount === 1 ? "" : "s"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[#606060]">
                          <p className="font-medium text-[#202224]">
                            {format(
                              new Date(order.created_at),
                              "MMM d · h:mm a",
                            )}
                          </p>
                          <p className="text-xs">
                            {formatDistanceToNow(new Date(order.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          <span className="inline-flex items-center gap-1.5">
                            {order.fulfillment_type === "delivery" ? (
                              <Bike className="size-3.5 text-[#4880ff]" />
                            ) : (
                              <Package className="size-3.5 text-[#00b69b]" />
                            )}
                            {order.fulfillment_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold tabular-nums text-[#202224]">
                          {formatMoney(Number(order.total))}
                        </td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <div className="admin-panel px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-[#606060] uppercase">
          {label}
        </p>
        <Icon className="size-3.5 text-[#4880ff]" strokeWidth={1.75} />
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-[#202224]">
        {value}
      </p>
    </div>
  );
}
