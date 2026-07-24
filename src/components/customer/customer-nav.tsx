"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ClipboardList, User } from "lucide-react";
import { useCart } from "@/lib/cart-store";
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

  if (pathname.startsWith("/auth")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around rounded-t-[30px] bg-primary px-2 pt-3 pb-2.5 shadow-[0_-4px_16px_rgba(233,83,34,0.25)]">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-opacity",
                  active ? "text-white opacity-100" : "text-white/70 hover:text-white",
                )}
              >
                <Icon className="size-6 stroke-[1.5]" />
                <span className="sr-only">{label}</span>
                {href === "/cart" && count > 0 ? (
                  <span className="absolute top-0 right-[calc(50%-14px)] flex size-4 items-center justify-center rounded-full bg-[var(--yum-yellow)] text-[9px] font-bold text-[var(--yum-ink)]">
                    {count}
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
