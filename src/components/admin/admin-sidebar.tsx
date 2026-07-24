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
  Radio,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <aside className="sticky top-0 z-30 hidden h-screen w-[15.5rem] shrink-0 flex-col border-r border-white/10 bg-[#2a120f] text-[#fff4ee] md:flex">
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
              <Store className="size-5 text-[#f5cb58]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {restaurantName}
            </p>
            <p className="inline-flex items-center gap-1 text-[11px] text-white/55">
              <Radio className="size-3 text-emerald-400" />
              Ops console
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2.5 py-2">
          <p className="mb-1 px-2.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
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
                  "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all",
                  active
                    ? "bg-[#e95322] text-white shadow-[0_8px_24px_rgba(233,83,34,0.35)]"
                    : "text-white/70 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-90" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-none">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[10px] leading-none",
                      active ? "text-white/80" : "text-white/40",
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
            className="w-full justify-start gap-2 text-white/65 hover:bg-white/10 hover:text-white"
            render={<Link href="/" target="_blank" />}
          >
            <ExternalLink className="size-4" />
            Storefront
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-white/65 hover:bg-white/10 hover:text-white"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="sticky top-0 z-30 border-b border-[#3a1c17] bg-[#2a120f] text-[#fff4ee] md:hidden">
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
                <Store className="size-4 text-[#f5cb58]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{restaurantName}</p>
              <p className="text-[11px] text-white/50">Ops console</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:bg-white/10 hover:text-white"
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
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-[#e95322] text-white"
                    : "bg-white/10 text-white/70",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
