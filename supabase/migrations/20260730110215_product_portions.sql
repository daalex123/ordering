-- Portion sizes per menu product (e.g. Small / Regular / Large)
create table if not exists public.product_portions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_portions_name_unique unique (product_id, name)
);

create index if not exists product_portions_product_idx
  on public.product_portions (product_id, sort_order);

create trigger product_portions_updated_at
  before update on public.product_portions
  for each row execute function public.set_updated_at();

alter table public.product_portions enable row level security;

create policy "Anyone can read available portions"
  on public.product_portions for select
  using (
    is_available = true
    or private.is_staff_or_admin()
  );

create policy "Admins manage portions"
  on public.product_portions for all
  using (private.is_admin())
  with check (private.is_admin());

-- Snapshot portion label on ordered line items
alter table public.order_items
  add column if not exists portion_name text;
