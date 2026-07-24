"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

export function HomeHeader({
  greeting,
  tagline,
  initialQuery,
  compact = false,
  logoUrl,
  restaurantName,
}: {
  greeting?: string;
  tagline?: string;
  initialQuery: string;
  compact?: boolean;
  logoUrl?: string | null;
  restaurantName?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    // Searching from home keeps home unless category already set
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <header className={cn("bg-[#F5CB58] px-5 pt-3", compact ? "pb-4" : "pb-5")}>
      {!compact ? (
        <div className="mb-3 flex items-center gap-2.5">
          <Image
            src={logoUrl || "/logo-kings-bakamuna.png"}
            alt={restaurantName || "Kings Bakamuna"}
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-xl object-cover"
            unoptimized
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold leading-tight text-[#391713]">
              {restaurantName || "Kings Bakamuna"}
            </p>
            {tagline ? (
              <p className="truncate text-[11px] font-medium text-[#E95322]">
                {tagline}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <form onSubmit={submit} className="relative min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-[42px] w-full rounded-full border-0 bg-white pr-11 pl-4 text-[12px] font-light text-[#391713] placeholder:text-[#676767] outline-none"
          />
          <button
            type="submit"
            className="absolute top-1/2 right-1.5 size-8 -translate-y-1/2 overflow-hidden rounded-full"
            aria-label="Search"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/yumquick/filter-btn.svg"
              alt=""
              width={32}
              height={32}
              className="size-full object-contain"
            />
          </button>
        </form>
        <HeaderIcon href="/cart" src="/yumquick/icon-cart.svg" label="Cart" badge={count} />
        <HeaderIcon href="/orders" src="/yumquick/icon-bell.svg" label="Orders" />
        <HeaderIcon href="/profile" src="/yumquick/icon-user.svg" label="Profile" />
      </div>
      {!compact && greeting ? (
        <div className="mt-4 space-y-1">
          <h1 className="text-[30px] font-bold capitalize leading-none tracking-tight text-[#F8F8F8]">
            {greeting}
          </h1>
        </div>
      ) : null}
    </header>
  );
}

function HeaderIcon({
  href,
  src,
  label,
  badge,
}: {
  href: string;
  src: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex size-[26px] shrink-0 items-center justify-center rounded-[10px] bg-[#F5F5F5]"
    >
      <span className="relative size-[14px] overflow-hidden">
        <Image src={src} alt="" fill className="object-contain" unoptimized />
      </span>
      {badge && badge > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#E95322] text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
