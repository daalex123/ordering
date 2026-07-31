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
  BarChart3,
  Columns3,
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
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Kitchen Board", icon: Columns3, exact: true },
  { href: "/admin/orders/list", label: "Orders", icon: ClipboardList },
  { href: "/admin/menu", label: "Products", icon: UtensilsCrossed },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function linkActive(pathname: string, href: string, exact?: boolean) {
  if (href === "/admin") return pathname === "/admin";
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
      <aside className="admin-rail sticky top-0 z-30 hidden h-screen w-60 shrink-0 flex-col border-r border-[#e6e8ef] bg-white text-[#202224] md:flex">
        <div className="flex items-center gap-2.5 px-6 py-6">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#eef3ff]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="size-full object-contain p-1"
              />
            ) : (
              <Store className="size-4 text-[#4880ff]" strokeWidth={1.75} />
            )}
          </div>
          <p className="truncate text-xl font-extrabold tracking-tight text-[#4880ff]">
            {restaurantName}
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-1">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = linkActive(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold tracking-wide transition-colors",
                  active
                    ? "bg-[#4880ff] text-white"
                    : "text-[#202224] hover:bg-[#f5f6fa]",
                )}
              >
                {active ? (
                  <span className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r bg-[#4880ff]" />
                ) : null}
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {href === "/admin/orders" && ordersBadge ? (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[#f93c65] text-white",
                    )}
                  >
                    {ordersBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <div className="my-3 h-px bg-[#e6e8ef]" />
          <p className="mb-1 px-4 text-[12px] font-bold tracking-[0.26px] text-[#202224]/60 uppercase">
            Pages
          </p>
          <Button
            variant="ghost"
            className="h-auto justify-start gap-3 rounded-md px-4 py-3 text-sm font-semibold text-[#202224] hover:bg-[#f5f6fa]"
            render={<Link href="/" target="_blank" />}
          >
            <ExternalLink className="size-[18px]" strokeWidth={1.75} />
            Storefront
          </Button>
          <Button
            variant="ghost"
            className="h-auto justify-start gap-3 rounded-md px-4 py-3 text-sm font-semibold text-[#202224] hover:bg-[#f5f6fa]"
            onClick={signOut}
          >
            <LogOut className="size-[18px]" strokeWidth={1.75} />
            Logout
          </Button>
        </nav>
      </aside>

      <div className="admin-rail sticky top-0 z-30 border-b border-[#e6e8ef] bg-white text-[#202224] md:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#eef3ff]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="size-full object-contain p-0.5"
                />
              ) : (
                <Store className="size-4 text-[#4880ff]" />
              )}
            </div>
            <p className="truncate text-base font-extrabold text-[#4880ff]">
              {restaurantName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#202224] hover:bg-[#f5f6fa]"
            onClick={signOut}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-2 pb-2.5">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = linkActive(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-[#4880ff] text-white"
                    : "bg-[#f5f6fa] text-[#202224]",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {label}
                {href === "/admin/orders" && ordersBadge ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f93c65] px-1 text-[9px] font-bold text-white">
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
