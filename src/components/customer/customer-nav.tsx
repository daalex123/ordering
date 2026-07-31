"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ClipboardList, User } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import {
  formatBadgeCount,
  unreadCount,
  useNotifications,
} from "@/lib/notification-store";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export function CustomerNav() {
  const pathname = usePathname();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const notifItems = useNotifications((s) => s.items);
  const notifBadge = formatBadgeCount(unreadCount(notifItems, "customer"));

  if (pathname.startsWith("/auth")) return null;
  if (pathname.startsWith("/welcome") || pathname.startsWith("/launch")) {
    return null;
  }

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="glass-panel-strong pointer-events-auto mx-auto flex max-w-lg items-stretch justify-around rounded-[28px] px-1.5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/product/")
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-1 py-1.5 transition-colors",
                  active ? "text-[var(--glass-accent)]" : "text-white/55",
                )}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.4 : 1.75}
                />
                <span className="text-[11px] font-medium leading-none">
                  {label}
                </span>
                {href === "/cart" && count > 0 ? (
                  <span className="absolute top-0 right-[calc(50%-18px)] flex size-4 items-center justify-center rounded-full bg-[var(--glass-accent)] text-[9px] font-bold text-white">
                    {count}
                  </span>
                ) : null}
                {href === "/orders" && notifBadge ? (
                  <span className="absolute top-0 right-[calc(50%-18px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--glass-accent)] px-1 text-[9px] font-bold text-white">
                    {notifBadge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
