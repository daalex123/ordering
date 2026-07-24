"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { formatMoney } from "@/types/database";
import { CustomerPageHeader } from "@/components/customer/customer-page-header";

export default function CartPage() {
  const { items, setQuantity, removeItem, subtotal } = useCart();
  const cartSubtotal = subtotal();
  const total = cartSubtotal;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col">
        <CustomerPageHeader title="Cart" backHref="/" />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-t-[30px] bg-primary px-8 py-16 text-center text-white -mt-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-white">
              <ShoppingCart className="size-6 text-primary" />
            </span>
            <h2 className="text-3xl font-bold">Cart</h2>
          </div>
          <div className="h-px w-full bg-white/40" />
          <p className="text-lg">Your cart is empty</p>
          <Link
            href="/"
            className="mt-4 flex size-20 items-center justify-center rounded-full border-2 border-white text-4xl font-light"
            aria-label="Add something"
          >
            +
          </Link>
          <p className="text-xl font-bold">Want To Add Something?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <CustomerPageHeader title="Cart" backHref="/" />
      <div className="flex flex-1 flex-col rounded-t-[30px] bg-primary px-6 pt-6 pb-8 text-white -mt-4">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-white">
            <ShoppingCart className="size-5 text-primary" />
          </span>
          <div>
            <h2 className="text-2xl font-bold leading-none">Cart</h2>
            <p className="mt-1 text-sm text-white/90">
              You have {items.length} item{items.length === 1 ? "" : "s"} in the
              cart
            </p>
          </div>
        </div>
        <div className="mb-4 h-px w-full bg-white/40" />

        <ul className="space-y-0">
          {items.map((item, index) => (
            <li key={item.productId}>
              <div className="flex items-center gap-3 py-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-white/20">
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
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-sm text-white/90">
                    {formatMoney(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-full bg-white text-primary"
                    onClick={() =>
                      setQuantity(item.productId, item.quantity - 1)
                    }
                    aria-label="Decrease"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-5 text-center font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-full bg-white text-primary"
                    onClick={() =>
                      setQuantity(item.productId, item.quantity + 1)
                    }
                    aria-label="Increase"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
              {index < items.length - 1 ? (
                <div className="h-px w-full bg-white/30" />
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-2 pt-8 text-sm">
          <Row label="Subtotal" value={formatMoney(cartSubtotal)} />
          <Row label="Delivery" value="At checkout" />
          <div className="my-2 border-t border-dashed border-white/50" />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => items.forEach((i) => removeItem(i.productId))}
            className="rounded-full border border-white/50 px-5 py-3 text-sm font-medium"
          >
            Clear
          </button>
          <Link
            href="/checkout"
            className="rounded-full bg-[var(--yum-yellow)] px-10 py-3 text-base font-semibold text-primary shadow-sm"
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
