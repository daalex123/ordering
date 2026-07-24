"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Product } from "@/types/database";
import { useCart } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <Label>Quantity</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </Button>
          <span className="w-8 text-center font-medium">{qty}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setQty((q) => q + 1)}
          >
            +
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Special requests</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="No onions, extra spicy..."
          rows={2}
        />
      </div>
      <Button className="w-full" size="lg" onClick={add}>
        Add to cart
      </Button>
    </div>
  );
}
