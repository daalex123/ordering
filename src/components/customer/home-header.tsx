"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search, SlidersHorizontal, User } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";

export function HomeHeader({
  greeting,
  firstName,
  headline,
  tagline,
  initialQuery,
  compact = false,
  logoUrl,
  restaurantName,
}: {
  greeting?: string;
  firstName?: string;
  headline?: string;
  tagline?: string;
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
  const brand = restaurantName || "Restaurant";

  return (
    <header className={cn("px-5 pt-4", compact ? "pb-3" : "pb-2")}>
      <div className="mb-4 flex items-center justify-between">
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
            className="glass-icon-btn"
            aria-label="Profile"
          >
            <User className="size-5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      {!compact ? (
        <section className="glass-enter glass-panel-strong relative mb-5 overflow-hidden rounded-[28px] p-5">
          <div className="pointer-events-none absolute -top-10 -right-8 size-36 rounded-full bg-[var(--glass-accent)]/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 size-28 rounded-full bg-[var(--glass-accent)]/10 blur-2xl" />

          <div className="relative z-10 flex items-center gap-3.5">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-[20px] border border-white/20 bg-white/10 shadow-lg">
              <Image
                src={logoUrl || "/logo-kings-bakamuna.png"}
                alt={brand}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium tracking-wide text-[var(--glass-accent)] uppercase">
                {greeting || "Welcome"}
              </p>
              <h1 className="truncate text-[24px] font-bold leading-tight text-white">
                {brand}
              </h1>
              {tagline ? (
                <p className="mt-0.5 truncate text-[13px] text-white/60">
                  {tagline}
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative z-10 mt-4 space-y-1">
            <p className="text-[15px] font-medium text-white/70">
              Hi, <span className="text-white">{displayName}</span>{" "}
              <span aria-hidden>👋</span>
            </p>
            <p className="max-w-[18ch] text-[28px] font-bold leading-[1.08] tracking-tight text-white">
              {headline || (
                <>
                  Good Food Good{" "}
                  <span className="text-[var(--glass-accent)]">Mood!</span>
                </>
              )}
            </p>
          </div>
        </section>
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
