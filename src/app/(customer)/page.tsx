import Link from "next/link";
import Image from "next/image";
import {
  Beef,
  Coffee,
  Drumstick,
  IceCream,
  Pizza,
  Salad,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/customer/product-card";
import { HomeHeader } from "@/components/customer/home-header";
import type {
  Category,
  ProductWithPortions,
  RestaurantSettings,
} from "@/types/database";
import { formatMoney } from "@/types/database";
import { getBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: LucideIcon[] = [
  UtensilsCrossed,
  Pizza,
  Drumstick,
  Beef,
  Salad,
  IceCream,
  Coffee,
];

function iconForCategory(name: string, index: number): LucideIcon {
  const n = name.toLowerCase();
  if (/pizza/.test(n)) return Pizza;
  if (/burger|beef|meat/.test(n)) return Beef;
  if (/chicken|wing|drum/.test(n)) return Drumstick;
  if (/vegan|veggie|vegetarian|salad|plant/.test(n)) return Salad;
  if (/dessert|sweet|cake|bakery|pastry|ice/.test(n)) return IceCream;
  if (/drink|beverage|juice|coffee|tea|cocktail/.test(n)) return Coffee;
  if (/snack|fries|side|starter/.test(n)) return UtensilsCrossed;
  return CATEGORY_ICONS[index % CATEGORY_ICONS.length];
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function firstNameFrom(fullName: string | null | undefined) {
  if (!fullName?.trim()) return undefined;
  return fullName.trim().split(/\s+/)[0];
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; menu?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [
    { data: settings },
    { data: categories },
    { data: products },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("restaurant_settings").select("*").limit(1).maybeSingle(),
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("products")
      .select("*, product_portions(id, price, is_available)")
      .eq("is_available", true)
      .order("sort_order"),
    supabase.auth.getUser(),
  ]);

  let firstName: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    firstName = firstNameFrom(profile?.full_name);
  }

  const restaurant = settings as RestaurantSettings | null;
  const branding = getBranding(restaurant);
  const cats = (categories ?? []) as Category[];
  const allItems = (products ?? []) as ProductWithPortions[];
  let items = allItems;

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

  const showFullMenu = params.menu === "1" || Boolean(params.category);
  const hour = new Date().getHours();
  const bestSellers = allItems.filter((p) => p.is_best_seller);
  const recommended = allItems.filter((p) => p.is_recommended);
  const popular =
    bestSellers.length > 0
      ? bestSellers
      : recommended.length > 0
        ? recommended
        : allItems.slice(0, 8);
  const promo = bestSellers[0] ?? recommended[0] ?? allItems[0] ?? null;
  const fullMenuHref = "/?menu=1";

  const homeChips = cats.map((cat, i) => ({
    id: cat.id,
    label: cat.name,
    href: `/?category=${cat.id}`,
    Icon: iconForCategory(cat.name, i),
  }));

  const browseChips = [
    {
      id: null as string | null,
      label: "All",
      href: fullMenuHref,
      Icon: UtensilsCrossed,
    },
    ...homeChips.map((c) => ({ ...c, id: c.id as string | null })),
  ];

  if (showFullMenu) {
    return (
      <CategoryBrowsePage
        items={items}
        chips={browseChips}
        activeId={params.category ?? null}
        restaurant={restaurant}
        initialQuery={params.q ?? ""}
        logoUrl={branding.logo_url}
        restaurantName={branding.name}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {/*
        THESIS: Dark warm glass stage — food floats over frost, orange commits action.
        OWN-WORLD: Translucent panels, amber atmosphere, orange CTAs, circular food crops.
        STORY: Guest greets, browses categories, grabs a promo or popular dish.
        FIRST VIEWPORT: Greeting + headline, glass search, category row, promo banner.
        FORM: Brief-pinned premium glassmorphism (Home + Product).
      */}
      <HomeHeader
        greeting={greetingForHour(hour)}
        firstName={firstName}
        initialQuery={params.q ?? ""}
        logoUrl={branding.logo_url}
        restaurantName={branding.name}
      />

      <div className="relative z-10 flex flex-1 flex-col px-5 pt-5 pb-6">
        {!restaurant?.is_open ? (
          <p className="glass-panel mb-4 rounded-[20px] px-3 py-2 text-[13px] text-white/80">
            We&apos;re currently closed. You can browse the menu, but ordering
            is paused.
          </p>
        ) : null}

        <div className="glass-enter glass-enter-delay-1 -mx-1 flex gap-3 overflow-x-auto px-1 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {homeChips.map((chip) => {
            const Icon = chip.Icon;
            return (
              <Link
                key={chip.id}
                href={chip.href}
                scroll={false}
                className="flex w-[68px] shrink-0 flex-col items-center gap-2 no-underline"
              >
                <span className="glass-panel grid size-[58px] place-items-center rounded-[20px] border text-white/80 transition hover:border-[var(--glass-accent)]/50 hover:text-white">
                  <Icon className="size-6" strokeWidth={1.75} />
                </span>
                <span className="w-full truncate text-center text-[12px] capitalize text-white/75">
                  {chip.label}
                </span>
              </Link>
            );
          })}
        </div>

        {promo ? <PromoBanner product={promo} /> : null}

        {popular.length > 0 ? (
          <section className="glass-enter glass-enter-delay-3 mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-white">
                Popular Now
              </h2>
              <Link
                href={fullMenuHref}
                className="text-[13px] font-medium text-[var(--glass-accent)]"
              >
                View All
              </Link>
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {popular.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant="popular"
                />
              ))}
            </div>
          </section>
        ) : null}

        {recommended.length > 0 && bestSellers.length > 0 ? (
          <section className="mt-6 space-y-3">
            <h2 className="text-[20px] font-semibold text-white">Recommend</h2>
            <div className="grid grid-cols-2 gap-3">
              {recommended.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant="recommend"
                />
              ))}
            </div>
          </section>
        ) : null}

        <Link
          href={fullMenuHref}
          className="glass-cta mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[20px] text-[15px] font-semibold tracking-wide"
        >
          Full menu
          <span aria-hidden>›</span>
        </Link>
      </div>
    </div>
  );
}

function PromoBanner({ product }: { product: ProductWithPortions }) {
  const portions = (product.product_portions ?? []).filter(
    (p) => p.is_available !== false,
  );
  const price =
    portions.length > 0
      ? Math.min(...portions.map((p) => Number(p.price)))
      : Number(product.price);

  return (
    <section className="glass-enter glass-enter-delay-2 glass-panel-strong relative overflow-hidden rounded-[28px] p-5">
      <div className="relative z-10 max-w-[58%] space-y-2">
        <p className="text-[11px] font-medium tracking-wide text-[var(--glass-accent)] uppercase">
          Limited Time Offer
        </p>
        <h2 className="text-[20px] font-bold leading-tight text-white">
          {product.name}
        </h2>
        <p className="text-[13px] text-white/60">{formatMoney(price)}</p>
        <Link
          href={`/product/${product.id}`}
          className="glass-cta mt-2 inline-flex h-10 items-center rounded-[20px] px-5 text-[13px] font-semibold"
        >
          Order Now
        </Link>
      </div>
      {product.image_url ? (
        <div className="absolute -right-2 -bottom-4 size-40 overflow-hidden rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:size-44">
          <Image
            src={product.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="176px"
            unoptimized
          />
        </div>
      ) : null}
    </section>
  );
}

function CategoryBrowsePage({
  items,
  chips,
  activeId,
  restaurant,
  initialQuery,
  logoUrl,
  restaurantName,
}: {
  items: ProductWithPortions[];
  chips: {
    id: string | null;
    label: string;
    href: string;
    Icon: LucideIcon;
  }[];
  activeId: string | null;
  restaurant: RestaurantSettings | null;
  initialQuery: string;
  logoUrl?: string | null;
  restaurantName?: string;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <HomeHeader
        initialQuery={initialQuery}
        compact
        logoUrl={logoUrl}
        restaurantName={restaurantName}
      />

      <div className="relative flex flex-1 flex-col px-5 pt-2 pb-4">
        <nav className="-mx-1 mb-4 flex gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => {
            const active = chip.id === activeId;
            const Icon = chip.Icon;
            return (
              <Link
                key={chip.label + (chip.id ?? "all")}
                href={chip.href}
                scroll={false}
                className="flex w-[68px] shrink-0 flex-col items-center gap-2 no-underline"
              >
                <span
                  className={cn(
                    "grid size-[58px] place-items-center rounded-[20px] border transition",
                    active
                      ? "border-transparent bg-[var(--glass-accent)] text-white shadow-[0_8px_20px_rgba(255,138,0,0.35)]"
                      : "glass-panel text-white/80",
                  )}
                >
                  <Icon className="size-6" strokeWidth={1.75} />
                </span>
                <span
                  className={cn(
                    "w-full truncate text-center text-[12px] capitalize",
                    active ? "font-semibold text-white" : "text-white/65",
                  )}
                >
                  {chip.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {!restaurant?.is_open ? (
          <p className="glass-panel mb-4 rounded-[20px] px-3 py-2 text-[13px] text-white/80">
            We&apos;re currently closed. You can browse the menu, but ordering
            is paused.
          </p>
        ) : null}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-[12px] font-light">
            <span className="text-white/55">Sort by </span>
            <span className="text-[var(--glass-accent)]">Popular</span>
          </p>
        </div>

        {items.length === 0 ? (
          <p className="py-12 text-center text-[14px] text-white/50">
            No dishes match your search.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
