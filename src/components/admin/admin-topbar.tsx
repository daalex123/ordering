"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  Columns3,
  LayoutDashboard,
  Search,
  Settings,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";

const COMMANDS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, hint: "Overview & KPIs" },
  { href: "/admin/orders", label: "Kitchen Board", icon: Columns3, hint: "Live kitchen queue" },
  { href: "/admin/orders/list", label: "Orders", icon: ClipboardList, hint: "Order history & search" },
  { href: "/admin/menu", label: "Products", icon: UtensilsCrossed, hint: "Products & categories" },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, hint: "Sales & product reports" },
  { href: "/admin/settings", label: "Settings", icon: Settings, hint: "Store & branding" },
];

export function AdminTopbar({ restaurantName }: { restaurantName: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.hint.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <>
      <header className="sticky top-0 z-20 mb-6 flex h-[70px] items-center justify-between gap-3 border-b border-[#e6e8ef] bg-white px-4 md:px-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-full max-w-[388px] items-center gap-3 rounded-full bg-[#f5f6fa] px-4 text-sm text-[#202224]/50 transition hover:bg-[#eef0f5]"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">Search</span>
          <kbd className="ml-auto hidden rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#606060] sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <NotificationBell scope="admin" variant="admin" />
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#eef3ff] text-[#4880ff]">
              <Store className="size-4" strokeWidth={1.75} />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold text-[#404040]">
                {restaurantName}
              </p>
              <p className="text-xs font-semibold text-[#565656]">Admin</p>
            </div>
          </div>
        </div>
      </header>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-sm">Quick jump</DialogTitle>
          </DialogHeader>
          <div className="border-b px-3 py-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-72 overflow-auto p-2">
            {filtered.map((cmd) => {
              const active =
                cmd.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === cmd.href ||
                    (cmd.href !== "/admin/orders" &&
                      pathname.startsWith(`${cmd.href}/`)) ||
                    (cmd.href === "/admin/orders" && pathname === "/admin/orders");
              const Icon = cmd.icon;
              return (
                <li key={cmd.href}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-[#eef3ff] text-[#4880ff]"
                        : "hover:bg-[#f5f6fa]",
                    )}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(cmd.href);
                    }}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{cmd.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {cmd.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matches
              </li>
            ) : null}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
