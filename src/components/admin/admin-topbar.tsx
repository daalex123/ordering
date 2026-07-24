"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ClipboardList,
  LayoutDashboard,
  Search,
  Settings,
  UtensilsCrossed,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const COMMANDS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, hint: "Overview & KPIs" },
  { href: "/admin/orders", label: "Order board", icon: ClipboardList, hint: "Kitchen queue" },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, hint: "Products & categories" },
  { href: "/admin/settings", label: "Settings", icon: Settings, hint: "Store & branding" },
];

export function AdminTopbar({ restaurantName }: { restaurantName: string }) {
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

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

  const pageLabel =
    COMMANDS.find((c) =>
      c.href === "/admin" ? pathname === "/admin" : pathname.startsWith(c.href),
    )?.label ?? "Admin";

  return (
    <>
      <header className="sticky top-0 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 px-3 py-2.5 shadow-[0_8px_30px_rgba(57,23,19,0.04)] backdrop-blur-xl md:px-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {restaurantName}
          </p>
          <p className="truncate text-sm font-semibold tracking-tight">{pageLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hidden items-center gap-2 rounded-xl border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground sm:inline-flex"
          >
            <Search className="size-3.5" />
            Jump to…
            <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-8 items-center justify-center rounded-xl border bg-background/80 text-muted-foreground sm:hidden"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <div className="rounded-xl border bg-background/80 px-3 py-1.5 text-right">
            <p className="font-mono text-sm font-semibold tabular-nums tracking-tight">
              {format(now, "h:mm:ss a")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {format(now, "EEE · MMM d")}
            </p>
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
                  : pathname.startsWith(cmd.href);
              const Icon = cmd.icon;
              return (
                <li key={cmd.href}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(cmd.href);
                    }}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{cmd.label}</span>
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
