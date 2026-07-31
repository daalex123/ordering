"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationScope = "customer" | "admin";

export type AppNotification = {
  id: string;
  scope: NotificationScope;
  title: string;
  body?: string;
  href: string;
  createdAt: number;
  read: boolean;
};

type NotificationState = {
  items: AppNotification[];
  push: (
    notification: Omit<AppNotification, "read" | "createdAt"> & {
      createdAt?: number;
    },
  ) => void;
  markRead: (id: string) => void;
  markAllRead: (scope: NotificationScope) => void;
};

export const useNotifications = create<NotificationState>()(
  persist(
    (set) => ({
      items: [],
      push: (notification) =>
        set((state) => {
          if (state.items.some((item) => item.id === notification.id)) {
            return state;
          }
          const next: AppNotification = {
            ...notification,
            createdAt: notification.createdAt ?? Date.now(),
            read: false,
          };
          return {
            items: [next, ...state.items].slice(0, 50),
          };
        }),
      markRead: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, read: true } : item,
          ),
        })),
      markAllRead: (scope) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.scope === scope ? { ...item, read: true } : item,
          ),
        })),
    }),
    { name: "kb-notifications" },
  ),
);

export function unreadCount(
  items: AppNotification[],
  scope: NotificationScope,
) {
  return items.filter((item) => item.scope === scope && !item.read).length;
}

export function formatBadgeCount(count: number) {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}
