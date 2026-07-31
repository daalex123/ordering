"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { formatMoney } from "@/types/database";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";

export default function CartPage() {
  const { items, setQuantity, removeItem, subtotal } = useCart();
  const cartSubtotal = subtotal();
  const total = cartSubtotal;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col px-5 pb-6">
        <CustomerPageHeader title="Cart" backHref="/" className="px-0" />
        <div className="glass-panel-strong flex flex-1 flex-col items-center justify-center gap-5 rounded-[28px] px-8 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-[var(--glass-accent)]/20 text-[var(--glass-accent)]">
            <ShoppingBag className="size-7" strokeWidth={1.75} />
          </span>
          <div className="space-y-2">
            <h2 className="text-[22px] font-bold text-white">Cart is empty</h2>
            <p className="text-[14px] text-white/55">
              Add something delicious to get started.
            </p>
          </div>
          <Link
            href="/"
            className="glass-cta mt-2 inline-flex h-12 items-center rounded-[20px] px-8 text-[15px] font-semibold"
          >
            Browse menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col px-5 pb-6">
      <CustomerPageHeader title="Cart" backHref="/" className="px-0" />

      <div className="glass-panel-strong flex flex-1 flex-col rounded-[28px] px-4 pt-5 pb-5">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <p className="text-[13px] text-white/60">
            {items.length} item{items.length === 1 ? "" : "s"} in your cart
          </p>
          <button
            type="button"
            onClick={() => items.forEach((i) => removeItem(i.lineId))}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/50 transition hover:text-[var(--glass-danger)]"
          >
            <Trash2 className="size-3.5" />
            Clear
          </button>
        </div>

        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.lineId}
              className="glass-panel flex items-center gap-3 rounded-[20px] p-3"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-[16px] bg-white/10">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-white">
                  {item.name}
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--glass-accent)]">
                  {formatMoney(item.price)}
                  {item.portionName ? (
                    <span className="ml-1 text-white/45">
                      · {item.portionName}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white"
                  onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                  aria-label="Decrease"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-5 text-center text-[14px] font-semibold text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full bg-[var(--glass-accent)] text-white"
                  onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                  aria-label="Increase"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-2 px-1 pt-6 text-[14px]">
          <Row label="Subtotal" value={formatMoney(cartSubtotal)} />
          <Row label="Delivery" value="At checkout" muted />
          <div className="my-2 border-t border-dashed border-white/20" />
          <div className="flex justify-between text-[16px] font-bold text-white">
            <span>Total</span>
            <span className="text-[var(--glass-accent)]">
              {formatMoney(total)}
            </span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="glass-cta mt-5 flex h-12 w-full items-center justify-center rounded-[20px] text-[15px] font-semibold"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between text-white/80">
      <span className={muted ? "text-white/50" : undefined}>{label}</span>
      <span className={muted ? "text-white/50" : undefined}>{value}</span>
    </div>
  );
}
