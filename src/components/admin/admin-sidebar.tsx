"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Settings,
  LogOut,
  Store,
  ExternalLink,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatBadgeCount,
  unreadCount,
  useNotifications,
} from "@/lib/notification-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, desc: "Live KPIs" },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, desc: "Kitchen board" },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, desc: "Catalog" },
  { href: "/admin/settings", label: "Settings", icon: Settings, desc: "Store config" },
];

export function AdminNav({
  restaurantName,
  logoUrl,
}: {
  restaurantName: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const notifItems = useNotifications((s) => s.items);
  const ordersBadge = formatBadgeCount(unreadCount(notifItems, "admin"));

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <aside className="admin-rail sticky top-0 z-30 hidden h-screen w-[15.5rem] shrink-0 flex-col border-r border-[#2a3340] bg-[#161b22] text-[#e8edf2] md:flex">
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="size-full object-contain p-1"
              />
            ) : (
              <Store className="size-5 text-[#d4a017]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-[#e8edf2]">
              {restaurantName}
            </p>
            <p className="inline-flex items-center gap-1.5 text-[11px] text-[#8b95a5]">
              <Activity className="size-3 text-teal-400" />
              Ops console
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
          <p className="mb-2 px-2.5 text-[10px] font-semibold tracking-[0.12em] text-[#8b95a5] uppercase">
            Workspace
          </p>
          {links.map(({ href, label, icon: Icon, desc }) => {
            const active =
              href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors duration-150",
                  active
                    ? "admin-nav-active bg-teal-600 text-white shadow-[0_6px_18px_rgba(13,148,136,0.28)]"
                    : "text-[#8b95a5] hover:bg-white/10 hover:text-[#e8edf2]",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-white/15" : "bg-white/5 group-hover:bg-white/10",
                  )}
                >
                  <Icon className="size-4 opacity-95" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block text-sm font-medium leading-none">
                      {label}
                    </span>
                    {href === "/admin/orders" && ordersBadge ? (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-[#d4a017] px-1 text-[9px] font-bold text-[#1a1408]">
                        {ordersBadge}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[10px] leading-none",
                      active ? "text-white/75" : "text-[#8b95a5]/80",
                    )}
                  >
                    {desc}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-2.5">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-[#8b95a5] hover:bg-white/10 hover:text-[#e8edf2]"
            render={<Link href="/" target="_blank" />}
          >
            <ExternalLink className="size-4" strokeWidth={1.75} />
            Storefront
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-[#8b95a5] hover:bg-white/10 hover:text-[#e8edf2]"
            onClick={signOut}
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="admin-rail sticky top-0 z-30 border-b border-[#2a3340] bg-[#161b22] text-[#e8edf2] md:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="size-full object-contain p-0.5"
                />
              ) : (
                <Store className="size-4 text-[#d4a017]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#e8edf2]">
                {restaurantName}
              </p>
              <p className="text-[11px] text-[#8b95a5]">Ops console</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#8b95a5] hover:bg-white/10 hover:text-[#e8edf2]"
            onClick={signOut}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-2 pb-2.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-teal-600 text-white"
                    : "bg-white/10 text-[#8b95a5]",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {label}
                {href === "/admin/orders" && ordersBadge ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-[#d4a017] px-1 text-[9px] font-bold text-[#1a1408]">
                    {ordersBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
