import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  formatMoney,
  type ProductPortion,
  type ProductWithPortions,
} from "@/types/database";
import { AddToCartButton } from "@/components/customer/add-to-cart-button";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_portions(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const product = data as ProductWithPortions;
  const portions = [...(product.product_portions ?? [])]
    .filter((p: ProductPortion) => p.is_available)
    .sort((a, b) => a.sort_order - b.sort_order);
  const fromPrice =
    portions.length > 0
      ? Math.min(...portions.map((p) => Number(p.price)))
      : Number(product.price);

  return (
    <div className="flex flex-col">
      <div className="relative bg-[var(--yum-yellow)] px-4 pt-4 pb-10">
        <Link
          href="/"
          className="absolute top-5 left-4 z-10 text-primary"
          aria-label="Back"
        >
          <ChevronLeft className="size-6" strokeWidth={2.5} />
        </Link>
        <div className="relative mx-auto mt-6 aspect-square max-w-[280px] overflow-hidden rounded-[30px] bg-white/30 shadow-lg">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No photo
            </div>
          )}
        </div>
      </div>

      <div className="-mt-6 space-y-4 rounded-t-[30px] bg-white px-5 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--yum-ink)]">
                {product.name}
              </h1>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                <Star className="size-3 fill-white" />
                4.7
              </span>
            </div>
            {product.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-xl font-bold text-primary">
            {portions.length > 1 ? "From " : ""}
            {formatMoney(fromPrice)}
          </p>
        </div>
        <AddToCartButton
          product={{ ...product, product_portions: portions }}
        />
      </div>
    </div>
  );
}
