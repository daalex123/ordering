"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import type { ProductWithPortions } from "@/types/database";
import { formatMoney } from "@/types/database";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

function displayPrice(product: ProductWithPortions) {
  const portions = (product.product_portions ?? []).filter(
    (p) => p.is_available !== false,
  );
  if (portions.length > 0) {
    const min = Math.min(...portions.map((p) => Number(p.price)));
    return {
      amount: min,
      from: portions.length > 1,
      hasPortions: true,
    };
  }
  return {
    amount: Number(product.price),
    from: false,
    hasPortions: false,
  };
}

export function ProductCard({
  product,
  variant = "list",
}: {
  product: ProductWithPortions;
  variant?: "list" | "seller" | "recommend" | "popular";
}) {
  const addItem = useCart((s) => s.addItem);
  const router = useRouter();
  const pricing = displayPrice(product);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pricing.hasPortions) {
      router.push(`/product/${product.id}`);
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.image_url,
    });
    toast.success(`${product.name} added to cart`);
  }

  const priceLabel = `${pricing.from ? "From " : ""}${formatMoney(pricing.amount)}`;

  if (variant === "popular" || variant === "seller" || variant === "recommend") {
    return (
      <Link
        href={`/product/${product.id}`}
        className={cn(
          "glass-panel relative block shrink-0 snap-start overflow-hidden rounded-[28px] p-3",
          variant === "recommend" ? "w-full" : "w-[148px]",
        )}
      >
        <button
          type="button"
          className="absolute top-3 right-3 z-10 text-white/50 transition hover:text-[var(--glass-danger)]"
          aria-label="Favorite"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Heart className="size-4" strokeWidth={1.75} />
        </button>
        <div className="relative mx-auto mb-3 aspect-square w-[88%] overflow-hidden rounded-full">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="120px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-white/40">
              No photo
            </div>
          )}
        </div>
        <h3 className="line-clamp-1 text-[14px] font-semibold text-white">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-[14px] font-bold text-[var(--glass-accent)]">
            {priceLabel}
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="flex size-7 items-center justify-center rounded-full bg-[var(--glass-accent)] text-white shadow-md"
            aria-label={`Add ${product.name}`}
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </Link>
    );
  }

  return (
    <article className="glass-panel overflow-hidden rounded-[28px] p-3">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-white/5">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 360px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/40">
              No photo
            </div>
          )}
          {(product.is_best_seller || product.is_recommended) && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              <Star className="size-2.5 fill-[var(--glass-accent)] text-[var(--glass-accent)]" />
              {product.is_best_seller ? "Best seller" : "Recommended"}
            </span>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-[var(--glass-accent)] text-white shadow-lg"
            aria-label={`Add ${product.name}`}
          >
            <Plus className="size-5" />
          </button>
        </div>
      </Link>
      <div className="mt-3 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <Link href={`/product/${product.id}`}>
            <h3 className="text-[18px] font-semibold capitalize leading-tight text-white">
              {product.name}
            </h3>
          </Link>
          {product.description ? (
            <p className="mt-1 line-clamp-2 text-[12px] font-light leading-normal text-white/55">
              {product.description}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 text-[18px] font-semibold text-[var(--glass-accent)]">
          {priceLabel}
        </p>
      </div>
    </article>
  );
}
