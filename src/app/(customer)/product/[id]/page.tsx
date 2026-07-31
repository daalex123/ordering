import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Heart, Star } from "lucide-react";
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

  const spicy =
    /spicy|hot|chili|chilli|pepper/i.test(product.name) ||
    /spicy|hot|chili|chilli/i.test(product.description ?? "");

  return (
    <div className="relative flex min-h-full flex-col">
      <div className="relative min-h-[48vh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,138,0,0.18),transparent_65%)]" />
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain object-center p-6 pt-16 pb-10"
            unoptimized
            priority
          />
        ) : (
          <div className="flex h-full min-h-[48vh] items-center justify-center text-white/40">
            No photo
          </div>
        )}

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-4">
          <Link href="/" className="glass-icon-btn" aria-label="Back">
            <ChevronLeft className="size-5" strokeWidth={2} />
          </Link>
          <button
            type="button"
            className="glass-icon-btn text-[var(--glass-danger)]"
            aria-label="Favorite"
          >
            <Heart className="size-5 fill-current" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="glass-panel-strong relative z-10 -mt-8 flex flex-1 flex-col rounded-t-[32px] px-5 pt-6 pb-8">
        {spicy ? (
          <span className="mb-3 inline-flex w-fit rounded-full bg-[var(--glass-danger)] px-2.5 py-0.5 text-[11px] font-semibold text-white">
            Spicy
          </span>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-[24px] font-bold leading-tight text-white">
              {product.name}
            </h1>
            {(product.is_best_seller || product.is_recommended) && (
              <p className="flex items-center gap-1.5 text-[13px] text-white/60">
                <Star className="size-3.5 fill-[var(--glass-accent)] text-[var(--glass-accent)]" />
                <span>
                  {product.is_best_seller ? "Best seller" : "Recommended"}
                </span>
              </p>
            )}
          </div>
          <p className="shrink-0 text-[22px] font-bold text-[var(--glass-accent)]">
            {portions.length > 1 ? "From " : ""}
            {formatMoney(fromPrice)}
          </p>
        </div>

        {product.description ? (
          <p className="mt-4 text-[13px] leading-relaxed text-white/55">
            {product.description}
          </p>
        ) : null}

        <div className="mt-5">
          <AddToCartButton
            product={{ ...product, product_portions: portions }}
          />
        </div>
      </div>
    </div>
  );
}
