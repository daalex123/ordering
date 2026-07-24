"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Product } from "@/types/database";
import { useCart } from "@/lib/cart-store";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";

export function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem);
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  function add() {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: qty,
      notes: notes.trim() || undefined,
      imageUrl: product.image_url,
    });
    toast.success("Added to cart");
    router.push("/cart");
  }

  return (
    <div className="space-y-4 rounded-[24px] bg-[var(--yum-peach)]/40 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-[var(--yum-ink)]">Quantity</Label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-sm"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-6 text-center text-lg font-semibold">{qty}</span>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full bg-primary text-white shadow-sm"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-[var(--yum-ink)]">
          Special requests
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="No onions, extra spicy..."
          rows={2}
          className="rounded-2xl border-0 bg-[var(--yum-cream)]"
        />
      </div>
      <button
        type="button"
        onClick={add}
        className="w-full rounded-full bg-primary py-3.5 text-base font-semibold text-white shadow-md"
      >
        Add to cart
      </button>
    </div>
  );
}
