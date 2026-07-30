"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import type { ProductWithPortions } from "@/types/database";
import { formatMoney } from "@/types/database";
import { useCart } from "@/lib/cart-store";

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
  variant?: "list" | "seller" | "recommend";
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
  const sellerPriceLabel = formatMoney(pricing.amount);

  if (variant === "seller") {
    return (
      <Link
        href={`/product/${product.id}`}
        className="relative w-[72px] shrink-0 snap-start"
      >
        <div className="relative aspect-[72/108] overflow-hidden rounded-[19px] bg-[#FFDECF]">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="72px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
              No photo
            </div>
          )}
          <span className="absolute right-0 bottom-2 rounded-l-full bg-[#E95322] px-2 py-0.5 text-[11px] font-medium text-white">
            {sellerPriceLabel}
          </span>
        </div>
      </Link>
    );
  }

  if (variant === "recommend") {
    return (
      <Link
        href={`/product/${product.id}`}
        className="relative block overflow-hidden rounded-[20px] bg-[#FFDECF]"
      >
        <div className="relative aspect-[159/140]">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="160px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No photo
            </div>
          )}
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#391713]">
            <Star className="size-2.5 fill-[#F4BA1B] text-[#F4BA1B]" />
            5.0
          </span>
          <span className="absolute right-0 bottom-3 rounded-l-full bg-[#E95322] px-2.5 py-0.5 text-[11px] font-medium text-white">
            {priceLabel}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <article className="space-y-2.5">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-[323/174] overflow-hidden rounded-[36px] bg-[#FFDECF]">
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
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No photo
            </div>
          )}
          <span className="absolute top-3 right-3 size-5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/yumquick/heart-on.svg"
              alt=""
              width={20}
              height={20}
              className="size-full object-contain"
            />
          </span>
          <button
            type="button"
            onClick={handleAdd}
            className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-[#E95322] text-white shadow-md"
            aria-label={`Add ${product.name}`}
          >
            <Plus className="size-5" />
          </button>
        </div>
      </Link>
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/product/${product.id}`}>
              <h3 className="text-[18px] font-semibold capitalize leading-tight text-[#391713]">
                {product.name}
              </h3>
            </Link>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E95322] px-2 py-0.5 text-[12px] font-normal text-[#F5F5F5]">
              5.0
              <Star className="size-2.5 fill-[#F4BA1B] text-[#F4BA1B]" />
            </span>
          </div>
          {product.description ? (
            <p className="mt-1 line-clamp-2 text-[12px] font-light leading-normal text-[#391713]">
              {product.description}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 text-[18px] font-normal capitalize text-[#E95322]">
          {priceLabel}
        </p>
      </div>
    </article>
  );
}
