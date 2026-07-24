import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/customer/product-card";
import { Badge } from "@/components/ui/badge";
import type { Category, Product, RestaurantSettings } from "@/types/database";
import { MenuSearch } from "@/components/customer/menu-search";
import { getBranding } from "@/lib/branding";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: settings }, { data: categories }, { data: products }] =
    await Promise.all([
      supabase.from("restaurant_settings").select("*").limit(1).maybeSingle(),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("sort_order"),
    ]);

  const restaurant = settings as RestaurantSettings | null;
  const branding = getBranding(restaurant);
  const cats = (categories ?? []) as Category[];
  let items = (products ?? []) as Product[];

  if (params.category) {
    items = items.filter((p) => p.category_id === params.category);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    );
  }

  const grouped = cats
    .map((cat) => ({
      category: cat,
      products: items.filter((p) => p.category_id === cat.id),
    }))
    .filter((g) => g.products.length > 0);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {branding.logo_url ? (
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border bg-[var(--brand-surface)]">
                <Image
                  src={branding.logo_url}
                  alt={branding.name}
                  fill
                  className="object-contain p-1"
                  unoptimized
                  priority
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">
                {branding.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {restaurant?.eta_text || branding.tagline}
                {restaurant?.address ? ` · ${restaurant.address}` : ""}
              </p>
            </div>
          </div>
          <Badge variant={restaurant?.is_open ? "default" : "secondary"}>
            {restaurant?.is_open ? "Open" : "Closed"}
          </Badge>
        </div>
        <MenuSearch initialQuery={params.q ?? ""} />
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <CategoryChip href="/" active={!params.category} label="All" />
        {cats.map((cat) => (
          <CategoryChip
            key={cat.id}
            href={`/?category=${cat.id}`}
            active={params.category === cat.id}
            label={cat.name}
          />
        ))}
      </div>

      {!restaurant?.is_open ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          We&apos;re currently closed. You can browse the menu, but ordering is
          paused.
        </p>
      ) : null}

      {grouped.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No dishes match your search.
        </p>
      ) : (
        grouped.map(({ category, products: list }) => (
          <section key={category.id} className="space-y-3">
            <h2 className="text-lg font-semibold">{category.name}</h2>
            <div className="grid gap-3">
              {list.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function CategoryChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </Link>
  );
}
