"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  /** Stable line key: productId or productId:portionId */
  lineId: string;
  productId: string;
  portionId?: string | null;
  portionName?: string | null;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
};

export function cartLineId(productId: string, portionId?: string | null) {
  return portionId ? `${productId}:${portionId}` : productId;
}

type CartState = {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, "quantity" | "lineId"> & {
      quantity?: number;
      lineId?: string;
    },
  ) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  setNotes: (lineId: string, notes: string) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const quantity = item.quantity ?? 1;
        const lineId =
          item.lineId ?? cartLineId(item.productId, item.portionId);
        set((state) => {
          const existing = state.items.find((i) => i.lineId === lineId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.lineId === lineId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                lineId,
                productId: item.productId,
                portionId: item.portionId ?? null,
                portionName: item.portionName ?? null,
                name: item.name,
                price: item.price,
                quantity,
                notes: item.notes,
                imageUrl: item.imageUrl,
              },
            ],
          };
        });
      },
      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.lineId !== lineId),
        })),
      setQuantity: (lineId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.lineId !== lineId)
              : state.items.map((i) =>
                  i.lineId === lineId ? { ...i, quantity } : i,
                ),
        })),
      setNotes: (lineId, notes) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.lineId === lineId ? { ...i, notes } : i,
          ),
        })),
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "food-ordering-cart",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { items?: Array<Record<string, unknown>> };
        const items = (state.items ?? []).map((item) => {
          const productId = String(item.productId ?? "");
          const portionId = (item.portionId as string | null | undefined) ?? null;
          return {
            ...item,
            lineId:
              (item.lineId as string | undefined) ??
              cartLineId(productId, portionId),
            portionId,
            portionName:
              (item.portionName as string | null | undefined) ?? null,
          };
        });
        return { ...state, items };
      },
    },
  ),
);
