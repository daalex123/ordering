-- Food ordering schema: profiles, menu, orders, settings + RLS

create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'staff', 'admin');
create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled'
);
create type public.fulfillment_type as enum ('pickup', 'delivery');
create type public.payment_method as enum ('cod', 'pay_at_pickup');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  default_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Kitchen',
  phone text,
  address text,
  is_open boolean not null default true,
  hours jsonb not null default '{}'::jsonb,
  delivery_enabled boolean not null default true,
  delivery_fee numeric(10, 2) not null default 0,
  min_order numeric(10, 2) not null default 0,
  eta_text text default '30-45 min',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'pending',
  fulfillment_type public.fulfillment_type not null,
  delivery_address jsonb,
  customer_phone text not null,
  customer_name text,
  payment_method public.payment_method not null default 'cod',
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index categories_sort_idx on public.categories (sort_order);
create index products_category_idx on public.products (category_id);
create index products_available_idx on public.products (is_available);
create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_created_idx on public.orders (created_at desc);
create index order_items_order_idx on public.order_items (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger restaurant_settings_updated_at
  before update on public.restaurant_settings
  for each row execute function public.set_updated_at();

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'customer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_staff_or_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Restaurant settings
create policy "Anyone can read restaurant settings"
  on public.restaurant_settings for select
  using (true);

create policy "Admins manage restaurant settings"
  on public.restaurant_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Categories
create policy "Anyone can read active categories"
  on public.categories for select
  using (is_active = true or public.is_staff_or_admin());

create policy "Admins manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- Products
create policy "Anyone can read available products"
  on public.products for select
  using (is_available = true or public.is_staff_or_admin());

create policy "Staff can update product availability"
  on public.products for update
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

create policy "Admins insert products"
  on public.products for insert
  with check (public.is_admin());

create policy "Admins delete products"
  on public.products for delete
  using (public.is_admin());

-- Orders
create policy "Customers read own orders"
  on public.orders for select
  using (auth.uid() = user_id or public.is_staff_or_admin());

create policy "Customers create own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Customers cancel own pending orders"
  on public.orders for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'cancelled');

create policy "Staff update order status"
  on public.orders for update
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- Order items
create policy "Read order items with order access"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or public.is_staff_or_admin())
    )
  );

create policy "Customers insert items for own orders"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admins upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admins update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());

create policy "Admins delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- Seed restaurant + sample menu
insert into public.restaurant_settings (
  name, phone, address, is_open, hours, delivery_enabled, delivery_fee, min_order, eta_text
) values (
  'Spice Route Kitchen',
  '+94 77 000 0000',
  '42 Galle Road, Colombo',
  true,
  '{"mon":"10:00-22:00","tue":"10:00-22:00","wed":"10:00-22:00","thu":"10:00-22:00","fri":"10:00-23:00","sat":"10:00-23:00","sun":"11:00-21:00"}'::jsonb,
  true,
  150.00,
  500.00,
  '30-45 min'
);

insert into public.categories (id, name, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Starters', 1),
  ('22222222-2222-2222-2222-222222222222', 'Mains', 2),
  ('33333333-3333-3333-3333-333333333333', 'Drinks', 3),
  ('44444444-4444-4444-4444-444444444444', 'Desserts', 4);

insert into public.products (category_id, name, description, price, is_available, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Chicken Spring Rolls', 'Crispy rolls with sweet chili sauce', 650.00, true, 1),
  ('11111111-1111-1111-1111-111111111111', 'Vegetable Samosas', 'Spiced potato filling, mint chutney', 450.00, true, 2),
  ('22222222-2222-2222-2222-222222222222', 'Butter Chicken', 'Creamy tomato curry with basmati rice', 1450.00, true, 1),
  ('22222222-2222-2222-2222-222222222222', 'Vegetable Kottu', 'Chopped roti with mixed vegetables', 950.00, true, 2),
  ('22222222-2222-2222-2222-222222222222', 'Grilled Fish', 'Catch of the day with lemon butter', 1750.00, true, 3),
  ('33333333-3333-3333-3333-333333333333', 'Fresh Lime Juice', 'House-squeezed lime soda', 350.00, true, 1),
  ('33333333-3333-3333-3333-333333333333', 'Iced Milo', 'Chilled chocolate malt drink', 400.00, true, 2),
  ('44444444-4444-4444-4444-444444444444', 'Watalappan', 'Coconut jaggery pudding', 550.00, true, 1);

alter publication supabase_realtime add table public.orders;
