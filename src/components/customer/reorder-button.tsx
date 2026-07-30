"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OrderItem } from "@/types/database";
import { useCart } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";

export function ReorderButton({ items }: { items: OrderItem[] }) {
  const addItem = useCart((s) => s.addItem);
  const clear = useCart((s) => s.clear);
  const router = useRouter();

  function reorder() {
    clear();
    for (const item of items) {
      if (!item.product_id) continue;
      addItem({
        productId: item.product_id,
        name: item.product_name,
        price: Number(item.unit_price),
        quantity: item.quantity,
        notes: item.notes ?? undefined,
        portionName: item.portion_name,
      });
    }
    toast.success("Items added to cart");
    router.push("/cart");
  }

  return (
    <Button className="w-full" onClick={reorder}>
      Reorder
    </Button>
  );
}
