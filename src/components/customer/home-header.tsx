"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search, SlidersHorizontal } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";

export function HomeHeader({
  greeting,
  firstName,
  headline,
  initialQuery,
  compact = false,
  logoUrl,
  restaurantName,
}: {
  greeting?: string;
  firstName?: string;
  headline?: string;
  initialQuery: string;
  compact?: boolean;
  logoUrl?: string | null;
  restaurantName?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const displayName = firstName || "there";

  return (
    <header className={cn("px-5 pt-4", compact ? "pb-3" : "pb-2")}>
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/?menu=1"
          className="glass-icon-btn"
          aria-label="Browse full menu"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-2.5">
          <NotificationBell scope="customer" variant="customer" />
          <Link
            href="/profile"
            className="relative size-11 overflow-hidden rounded-full border border-white/20 shadow-lg"
            aria-label="Profile"
          >
            <Image
              src={logoUrl || "/logo-kings-bakamuna.png"}
              alt={restaurantName || "Profile"}
              fill
              className="object-cover"
              unoptimized
              priority
            />
            <span className="absolute top-0 right-0 size-2.5 rounded-full border-2 border-[#1a120e] bg-[var(--glass-danger)]" />
          </Link>
        </div>
      </div>

      {!compact ? (
        <div className="glass-enter mb-5 space-y-1">
          <p className="text-[15px] font-medium text-white/70">
            Hi, <span className="text-white">{displayName}</span>{" "}
            <span aria-hidden>👋</span>
            {greeting ? (
              <span className="sr-only"> — {greeting}</span>
            ) : null}
          </p>
          <h1 className="max-w-[16ch] text-[32px] font-bold leading-[1.05] tracking-tight text-white">
            {headline || (
              <>
                Good Food Good{" "}
                <span className="text-[var(--glass-accent)]">Mood!</span>
              </>
            )}
          </h1>
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className="glass-enter glass-enter-delay-1 relative"
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/45"
          strokeWidth={1.75}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your favorite food"
          className="glass-panel h-12 w-full rounded-full border-0 pr-12 pl-11 text-[13px] font-medium text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition hover:text-white"
          aria-label="Search"
        >
          <SlidersHorizontal className="size-4" strokeWidth={1.75} />
        </button>
      </form>
    </header>
  );
}
