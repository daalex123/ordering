"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  formatBadgeCount,
  unreadCount,
  useNotifications,
  type AppNotification,
  type NotificationScope,
} from "@/lib/notification-store";
import { cn } from "@/lib/utils";

export function NotificationBell({
  scope,
  variant = "admin",
}: {
  scope: NotificationScope;
  variant?: "admin" | "customer";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);

  const scoped = useMemo(
    () =>
      items
        .filter((item) => item.scope === scope)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20),
    [items, scope],
  );
  const count = unreadCount(items, scope);
  const badge = formatBadgeCount(count);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openItem(item: AppNotification) {
    markRead(item.id);
    setOpen(false);
    router.push(item.href);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        aria-expanded={open}
        className={cn(
          "relative inline-flex items-center justify-center transition",
          variant === "customer"
            ? "size-[26px] rounded-[10px] bg-[#F5F5F5]"
            : "size-8 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-canvas)] text-muted-foreground hover:border-teal-300/60 hover:text-foreground",
        )}
      >
        {variant === "customer" ? (
          <span className="relative size-[14px] overflow-hidden">
            <Image
              src="/yumquick/icon-bell.svg"
              alt=""
              fill
              className="object-contain"
              unoptimized
            />
          </span>
        ) : (
          <Bell className="size-4" strokeWidth={1.75} />
        )}
        {badge ? (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-[#E95322] font-bold text-white",
              variant === "customer"
                ? "-top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px]"
                : "-top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px]",
            )}
          >
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-white shadow-[0_16px_40px_rgba(57,23,19,0.14)]",
            variant === "customer" ? "right-0" : "right-0",
          )}
        >
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <p className="text-sm font-semibold text-[#391713]">Notifications</p>
            {count > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead(scope)}
                className="text-[11px] font-medium text-[#E95322] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {scoped.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <ul className="max-h-80 overflow-auto py-1">
              {scoped.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-[#F5CB58]/25",
                      !item.read && "bg-[#F5CB58]/15",
                    )}
                  >
                    <span className="flex items-start gap-2">
                      {!item.read ? (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#E95322]" />
                      ) : (
                        <span className="mt-1.5 size-1.5 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[#391713]">
                          {item.title}
                        </span>
                        {item.body ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {item.body}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {formatDistanceToNow(item.createdAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t px-3 py-2">
            <Link
              href={scope === "admin" ? "/admin/orders" : "/orders"}
              onClick={() => {
                markAllRead(scope);
                setOpen(false);
              }}
              className="block text-center text-xs font-semibold text-[#E95322] hover:underline"
            >
              {scope === "admin" ? "Open order board" : "View orders"}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
