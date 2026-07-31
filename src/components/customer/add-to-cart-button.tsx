"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProductPortion, ProductWithPortions } from "@/types/database";
import { formatMoney } from "@/types/database";
import { useCart } from "@/lib/cart-store";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  product,
}: {
  product: ProductWithPortions;
}) {
  const addItem = useCart((s) => s.addItem);
  const router = useRouter();
  const portions = useMemo(
    () =>
      [...(product.product_portions ?? [])]
        .filter((p) => p.is_available)
        .sort((a, b) => a.sort_order - b.sort_order),
    [product.product_portions],
  );
  const [portionId, setPortionId] = useState<string | null>(
    portions[0]?.id ?? null,
  );
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const selected: ProductPortion | null =
    portions.find((p) => p.id === portionId) ?? portions[0] ?? null;

  const unitPrice = selected
    ? Number(selected.price)
    : Number(product.price);

  function add() {
    if (portions.length > 0 && !selected) {
      toast.error("Choose a portion size");
      return;
    }
    const displayName = selected
      ? `${product.name} (${selected.name})`
      : product.name;
    addItem({
      productId: product.id,
      portionId: selected?.id ?? null,
      portionName: selected?.name ?? null,
      name: displayName,
      price: unitPrice,
      quantity: qty,
      notes: notes.trim() || undefined,
      imageUrl: product.image_url,
    });
    toast.success("Added to cart");
    router.push("/cart");
  }

  return (
    <div className="space-y-5">
      {portions.length > 0 ? (
        <div className="space-y-2.5">
          <Label className="text-[13px] font-medium text-white/70">Size</Label>
          <div className="flex flex-wrap gap-2">
            {portions.map((portion) => {
              const active = (selected?.id ?? null) === portion.id;
              return (
                <button
                  key={portion.id}
                  type="button"
                  onClick={() => setPortionId(portion.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-[13px] font-semibold transition",
                    active
                      ? "bg-[var(--glass-accent)] text-white shadow-[0_6px_16px_rgba(255,138,0,0.35)]"
                      : "glass-panel text-white/80",
                  )}
                >
                  {portion.name}
                  <span className="ml-1.5 font-normal opacity-80">
                    {formatMoney(Number(portion.price))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label
          htmlFor="notes"
          className="text-[13px] font-medium text-white/70"
        >
          Special requests
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="No onions, extra spicy..."
          rows={2}
          className="rounded-[20px] border-white/15 bg-white/8 text-white placeholder:text-white/35"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <div className="glass-panel flex h-12 items-center gap-3 rounded-full px-2">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-5 text-center text-[15px] font-semibold text-white">
            {qty}
          </span>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          className="glass-cta flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[20px] px-4 text-[15px] font-semibold"
        >
          <span>Add to Cart</span>
          <span className="opacity-70">|</span>
          <span>{formatMoney(unitPrice * qty)}</span>
        </button>
      </div>
    </div>
  );
}
