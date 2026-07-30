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
    <div className="space-y-4 rounded-[24px] bg-[var(--yum-peach)]/40 p-4">
      {portions.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-[var(--yum-ink)]">Portion size</Label>
          <div className="flex flex-wrap gap-2">
            {portions.map((portion) => {
              const active = (selected?.id ?? null) === portion.id;
              return (
                <button
                  key={portion.id}
                  type="button"
                  onClick={() => setPortionId(portion.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-transparent bg-white text-[var(--yum-ink)]",
                  )}
                >
                  {portion.name}
                  <span className="ml-1.5 font-normal opacity-90">
                    {formatMoney(Number(portion.price))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

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
        Add to cart · {formatMoney(unitPrice * qty)}
      </button>
    </div>
  );
}
