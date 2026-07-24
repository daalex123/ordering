"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import { formatMoney } from "@/types/database";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const { items, setQuantity, setNotes, removeItem, subtotal } = useCart();
  const total = subtotal();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-medium">Your cart is empty</p>
        <p className="text-sm text-muted-foreground">
          Browse the menu and add something delicious.
        </p>
        <Link href="/" className={cn(buttonVariants())}>
          View menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cart</h1>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.productId} className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMoney(item.price)} each
                </p>
              </div>
              <p className="shrink-0 font-semibold">
                {formatMoney(item.price * item.quantity)}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(item.productId, item.quantity - 1)}
              >
                −
              </Button>
              <span className="w-8 text-center">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(item.productId, item.quantity + 1)}
              >
                +
              </Button>
              <Button
                variant="ghost"
                className="ml-auto text-destructive"
                onClick={() => removeItem(item.productId)}
              >
                Remove
              </Button>
            </div>
            <Textarea
              className="mt-2"
              rows={2}
              placeholder="Item notes"
              value={item.notes ?? ""}
              onChange={(e) => setNotes(item.productId, e.target.value)}
            />
          </li>
        ))}
      </ul>
      <div className="sticky bottom-20 space-y-3 rounded-xl border bg-background p-4 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatMoney(total)}</span>
        </div>
        <Link
          href="/checkout"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
