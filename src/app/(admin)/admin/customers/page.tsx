"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Download,
  Eye,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildCustomerRows,
  customerDisplayName,
  type CustomerOrderLite,
  type CustomerRow,
} from "@/lib/admin-customers";
import { downloadCsv, toCsv } from "@/lib/admin-reports";
import { formatMoney, type Profile } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ActivityFilter = "all" | "ordered" | "never";

const PAGE_SIZE = 25;

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [page, setPage] = useState(0);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    else setRefreshing(true);
    const supabase = createClient();
    const [profilesRes, ordersRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, user_id, status, total, created_at, fulfillment_type")
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);
    setLoading(false);
    setRefreshing(false);
    if (profilesRes.error) {
      toast.error(profilesRes.error.message);
      return;
    }
    if (ordersRes.error) {
      toast.error(ordersRes.error.message);
      return;
    }
    setCustomers(
      buildCustomerRows(
        (profilesRes.data ?? []) as Profile[],
        (ordersRes.data ?? []) as CustomerOrderLite[],
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [query, activity]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => {
        if (activity === "ordered" && c.order_count === 0) return false;
        if (activity === "never" && c.order_count > 0) return false;
        if (!q) return true;
        const hay = [c.full_name, c.phone, c.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (b.order_count !== a.order_count) return b.order_count - a.order_count;
        const aLast = a.last_order_at ?? a.created_at;
        const bLast = b.last_order_at ?? b.created_at;
        return bLast.localeCompare(aLast);
      });
  }, [customers, query, activity]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const summary = useMemo(() => {
    const withOrders = customers.filter((c) => c.order_count > 0).length;
    const spend = customers.reduce((s, c) => s + c.total_spent, 0);
    return { total: customers.length, withOrders, spend };
  }, [customers]);

  function exportCsv() {
    const csv = toCsv(
      [
        "Name",
        "Phone",
        "Orders",
        "Completed",
        "Cancelled",
        "Total spent",
        "Last order",
        "Joined",
      ],
      filtered.map((c) => [
        customerDisplayName(c),
        c.phone ?? "",
        c.order_count,
        c.completed_count,
        c.cancelled_count,
        c.total_spent.toFixed(2),
        c.last_order_at
          ? format(new Date(c.last_order_at), "yyyy-MM-dd HH:mm")
          : "",
        format(new Date(c.created_at), "yyyy-MM-dd HH:mm"),
      ]),
    );
    downloadCsv(
      `customers-${format(new Date(), "yyyyMMdd-HHmm")}.csv`,
      csv,
    );
    toast.success("Customers exported");
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Customers"
        description="Registered guests, order history, and spend"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={!filtered.length}
              onClick={exportCsv}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
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

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Customers"
          value={loading ? "…" : String(summary.total)}
          hint="Registered accounts"
        />
        <SummaryCard
          label="Have ordered"
          value={loading ? "…" : String(summary.withOrders)}
          hint="At least one ticket"
        />
        <SummaryCard
          label="Completed spend"
          value={loading ? "…" : formatMoney(summary.spend)}
          hint="Sum of completed orders"
        />
      </div>

      <div className="admin-panel space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#606060]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone…"
            className="h-11 rounded-lg bg-[#f5f6fa] pl-10"
          />
          {query ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-[#606060] hover:bg-white"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["ordered", "Have ordered"],
              ["never", "Never ordered"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActivity(value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                activity === value
                  ? "border-[#4880ff] bg-[#4880ff] text-white"
                  : "border-[#e0e2e7] bg-white text-[#202224] hover:bg-[#f5f6fa]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-panel overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-[#f1f4f9] px-4 py-3">
          <p className="text-sm font-semibold text-[#202224]">
            {loading
              ? "Loading…"
              : `${filtered.length} customer${filtered.length === 1 ? "" : "s"}`}
          </p>
          <p className="text-xs text-[#606060]">
            Page {page + 1} of {pageCount}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="bg-[#f1f4f9] text-left">
                {[
                  "Customer",
                  "Orders",
                  "Spent",
                  "Last order",
                  "Joined",
                  "",
                ].map((h) => (
                  <th
                    key={h || "actions"}
                    className="px-4 py-3 font-bold text-[#202224]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-10 animate-pulse rounded-lg bg-[#f1f4f9]" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[#606060]"
                  >
                    <Users className="mx-auto mb-2 size-8 text-[#c0c4cc]" />
                    No customers match these filters
                  </td>
                </tr>
              ) : (
                pageRows.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-[#f1f4f9] transition hover:bg-[#f8f9fc]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#202224]">
                        {customerDisplayName(customer)}
                      </p>
                      {customer.phone ? (
                        <p className="inline-flex items-center gap-1 text-xs text-[#606060]">
                          <Phone className="size-3" />
                          {customer.phone}
                        </p>
                      ) : (
                        <p className="text-xs text-[#606060]">No phone</p>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#202224]">
                      <span className="font-semibold">{customer.order_count}</span>
                      {customer.completed_count > 0 ? (
                        <span className="ml-1 text-xs text-[#606060]">
                          · {customer.completed_count} done
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums text-[#202224]">
                      {formatMoney(customer.total_spent)}
                    </td>
                    <td className="px-4 py-3 text-[#606060]">
                      {customer.last_order_at ? (
                        <>
                          <p className="font-medium text-[#202224]">
                            {format(
                              new Date(customer.last_order_at),
                              "MMM d · h:mm a",
                            )}
                          </p>
                          <p className="text-xs">
                            {formatDistanceToNow(
                              new Date(customer.last_order_at),
                              { addSuffix: true },
                            )}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#606060]">
                      {format(new Date(customer.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/admin/customers/${customer.id}`} />}
                      >
                        <Eye className="size-3.5" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#f1f4f9] px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="admin-panel px-4 py-4">
      <p className="text-xs font-semibold tracking-wide text-[#606060] uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#202224]">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[#606060]">{hint}</p>
    </div>
  );
}
