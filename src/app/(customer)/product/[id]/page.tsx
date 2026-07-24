import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Product } from "@/types/database";
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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const product = data as Product;

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No photo
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-lg font-semibold text-primary">
          {formatMoney(Number(product.price))}
        </p>
        {product.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        ) : null}
      </div>
      <AddToCartButton product={product} />
    </div>
  );
}
