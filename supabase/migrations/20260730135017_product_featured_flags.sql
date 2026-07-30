-- Admin-curated home sections: Best Seller + Recommend
alter table public.products
  add column if not exists is_best_seller boolean not null default false,
  add column if not exists is_recommended boolean not null default false;

create index if not exists products_best_seller_idx
  on public.products (is_best_seller, sort_order)
  where is_best_seller;

create index if not exists products_recommended_idx
  on public.products (is_recommended, sort_order)
  where is_recommended;
