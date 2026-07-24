import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/customer/product-card";
import { HomeHeader } from "@/components/customer/home-header";
import type { Category, Product, RestaurantSettings } from "@/types/database";
import { getBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = [
  "/yumquick/cat-snacks.svg",
  "/yumquick/cat-meal.svg",
  "/yumquick/cat-vegan.svg",
  "/yumquick/cat-dessert.svg",
  "/yumquick/cat-drinks.svg",
];

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

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
  const allItems = (products ?? []) as Product[];
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

  const categorySelected = Boolean(params.category);
  const hour = new Date().getHours();
  const bestSellers = allItems.slice(0, 8);
  const recommended = allItems.slice().reverse().slice(0, 2);
  const viewAllHref = cats[0] ? `/?category=${cats[0].id}` : "/";

  // Category chips — home uses real categories (no "All" tab), selected uses All + cats
  const homeChips = cats.map((cat, i) => ({
    id: cat.id,
    label: cat.name,
    href: `/?category=${cat.id}`,
    icon: CATEGORY_ICONS[i % CATEGORY_ICONS.length],
  }));

  const browseChips = [
    {
      id: null as string | null,
      label: "All",
      href: "/",
      icon: CATEGORY_ICONS[0],
    },
    ...homeChips.map((c) => ({ ...c, id: c.id as string | null })),
  ];

  if (categorySelected) {
    return (
      <CategoryBrowsePage
        items={items}
        chips={browseChips}
        activeId={params.category ?? null}
        restaurant={restaurant}
        initialQuery={params.q ?? ""}
      />
    );
  }

  // ——— 9.1 Home (Figma 242:1715) ———
  return (
    <div className="flex min-h-full flex-col bg-[#F5CB58]">
      <HomeHeader
        greeting={greetingForHour(hour)}
        tagline={restaurant?.eta_text || branding.tagline}
        initialQuery={params.q ?? ""}
      />

      <div className="relative z-10 -mt-1 flex flex-1 flex-col rounded-t-[30px] bg-[#F5F5F5] px-5 pt-5 pb-6">
        {!restaurant?.is_open ? (
          <p className="mb-4 rounded-2xl bg-[#FFDECF] px-3 py-2 text-sm text-[#391713]">
            We&apos;re currently closed. You can browse the menu, but ordering
            is paused.
          </p>
        ) : null}

        {/* Categories — none selected on home */}
        <div className="grid grid-flow-col auto-cols-fr items-start justify-items-center gap-1 pb-3">
          {homeChips.map((chip) => (
            <Link
              key={chip.id}
              href={chip.href}
              scroll={false}
              className="flex w-full max-w-[64px] flex-col items-center gap-1.5 no-underline"
            >
              <span className="grid size-[49px] place-items-center rounded-full bg-[#F3E9B5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={chip.icon}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 object-contain"
                  draggable={false}
                />
              </span>
              <span className="w-full text-center text-[12px] capitalize leading-none text-[#391713]">
                {chip.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="mb-4 h-px w-full bg-[#FFD8C7]" />

        {/* Best Seller */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-medium text-[#391713]">
              Best Seller
            </h2>
            <Link
              href={viewAllHref}
              className="flex items-center gap-1 text-[12px] font-semibold capitalize text-[#E95322]"
            >
              View All
              <span aria-hidden className="text-sm">
                ›
              </span>
            </Link>
          </div>
          <div className="flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="seller"
              />
            ))}
          </div>
        </section>

        {/* Promo banner */}
        <div className="relative mt-5 overflow-hidden rounded-[20px] bg-[#E95322] shadow-[0_4px_4px_rgba(215,215,215,1)]">
          <div className="pointer-events-none absolute -top-8 left-[28%] size-14 rounded-full border-8 border-[#F5CB58]" />
          <div className="pointer-events-none absolute -bottom-4 -left-3 size-12 rounded-full border-8 border-[#F5CB58]" />
          <div className="relative z-10 flex min-h-[128px] items-center px-4 py-5">
            <div className="max-w-[48%] space-y-1 text-center text-[#F8F8F8]">
              <p className="text-[16px] leading-snug">
                Experience our delicious new dish
              </p>
              <p className="text-[32px] font-bold leading-none">30% OFF</p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-5 rounded-full",
                i === 1 ? "bg-[#E95322]" : "bg-[#F3E9B5]",
              )}
            />
          ))}
        </div>

        {/* Recommend */}
        <section className="mt-5 space-y-3">
          <h2 className="text-[20px] font-medium text-[#391713]">Recommend</h2>
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
      </div>
    </div>
  );
}

function CategoryBrowsePage({
  items,
  chips,
  activeId,
  restaurant,
  initialQuery,
}: {
  items: Product[];
  chips: { id: string | null; label: string; href: string; icon: string }[];
  activeId: string | null;
  restaurant: RestaurantSettings | null;
  initialQuery: string;
}) {
  return (
    <div className="flex min-h-full flex-col bg-[#F5CB58]">
      <HomeHeader initialQuery={initialQuery} compact />

      <div className="relative flex flex-1 flex-col rounded-t-[30px] bg-[#E95322]">
        <nav className="relative z-20 grid grid-flow-col auto-cols-fr items-start justify-items-center gap-1 px-4 pt-4 pb-2">
          {chips.map((chip) => {
            const active = chip.id === activeId;
            return (
              <Link
                key={chip.label + (chip.id ?? "all")}
                href={chip.href}
                scroll={false}
                className={cn(
                  "relative flex w-full max-w-[64px] flex-col items-center gap-1.5 pt-1 pb-3 no-underline",
                  active && "z-30",
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-[-8px] -top-2 bottom-[-20px]"
                  >
                    <span className="absolute inset-0 rounded-t-[20px] bg-[#F5F5F5]" />
                    <span className="absolute -bottom-0 -left-3 size-3 rounded-br-full shadow-[6px_0_0_0_#F5F5F5]" />
                    <span className="absolute -right-3 -bottom-0 size-3 rounded-bl-full shadow-[-6px_0_0_0_#F5F5F5]" />
                  </span>
                ) : null}
                <span
                  className={cn(
                    "relative z-10 grid size-[49px] place-items-center rounded-full",
                    active ? "bg-[#F5CB58]" : "bg-[#F3E9B5]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chip.icon}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 object-contain"
                    draggable={false}
                  />
                </span>
                <span
                  className={cn(
                    "relative z-10 w-full text-center text-[12px] capitalize leading-none",
                    active
                      ? "font-medium text-[#391713]"
                      : "font-normal text-white",
                  )}
                >
                  {chip.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 -mt-2 flex flex-1 flex-col rounded-t-[30px] bg-[#F5F5F5] px-5 pt-5 pb-4">
          {!restaurant?.is_open ? (
            <p className="mb-4 rounded-2xl bg-[#FFDECF] px-3 py-2 text-sm text-[#391713]">
              We&apos;re currently closed. You can browse the menu, but ordering
              is paused.
            </p>
          ) : null}

          <div className="mb-4 flex items-center justify-between">
            <p className="text-[12px] font-light capitalize">
              <span className="text-[#070707]">Sort by </span>
              <span className="text-[#E95322]">Popular</span>
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/yumquick/sort-filter.svg"
              alt=""
              width={20}
              height={20}
              className="size-5"
            />
          </div>

          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No dishes match your search.
            </p>
          ) : (
            <ul>
              {items.map((product, i) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                  {i < items.length - 1 ? (
                    <div className="my-5 h-px w-full bg-[#FFD8C7]" />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
