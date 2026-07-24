create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, anon, authenticated, service_role;

create or replace function private.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function private.is_staff_or_admin() from public;
revoke all on function private.is_admin() from public;
grant execute on function private.is_staff_or_admin() to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id or private.is_staff_or_admin());

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (private.is_admin())
  with check (private.is_admin());

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

drop policy if exists "Admins manage restaurant settings" on public.restaurant_settings;
create policy "Admins manage restaurant settings"
  on public.restaurant_settings for all
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Anyone can read active categories" on public.categories;
create policy "Anyone can read active categories"
  on public.categories for select
  using (is_active = true or private.is_staff_or_admin());

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
  on public.categories for all
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Anyone can read available products" on public.products;
create policy "Anyone can read available products"
  on public.products for select
  using (is_available = true or private.is_staff_or_admin());

drop policy if exists "Staff can update product availability" on public.products;
create policy "Staff can update product availability"
  on public.products for update
  using (private.is_staff_or_admin())
  with check (private.is_staff_or_admin());

drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products"
  on public.products for insert
  with check (private.is_admin());

drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products"
  on public.products for delete
  using (private.is_admin());

drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders"
  on public.orders for select
  using (auth.uid() = user_id or private.is_staff_or_admin());

drop policy if exists "Staff update order status" on public.orders;
create policy "Staff update order status"
  on public.orders for update
  using (private.is_staff_or_admin())
  with check (private.is_staff_or_admin());

drop policy if exists "Read order items with order access" on public.order_items;
create policy "Read order items with order access"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or private.is_staff_or_admin())
    )
  );

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and private.is_admin());

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and private.is_admin());

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and private.is_admin());

drop function if exists public.is_admin();
drop function if exists public.is_staff_or_admin();
revoke execute on function public.prevent_role_escalation() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
