"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types/database";
import { formatMoney } from "@/types/database";
import { useCart } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.image_url,
    });
    toast.success(`${product.name} added to cart`);
  }

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/10] bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 320px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No photo
            </div>
          )}
        </div>
        <CardContent className="flex items-start justify-between gap-2 p-3">
          <div className="min-w-0">
            <h3 className="truncate font-medium">{product.name}</h3>
            {product.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {product.description}
              </p>
            ) : null}
            <p className="mt-1.5 text-sm font-semibold text-primary">
              {formatMoney(Number(product.price))}
            </p>
          </div>
          <Button
            size="icon"
            className="shrink-0 rounded-full"
            onClick={handleAdd}
            aria-label={`Add ${product.name}`}
          >
            <Plus className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
