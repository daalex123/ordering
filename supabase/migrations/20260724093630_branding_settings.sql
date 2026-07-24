-- Branding config on restaurant_settings

alter table public.restaurant_settings
  add column if not exists logo_url text,
  add column if not exists favicon_url text,
  add column if not exists tagline text,
  add column if not exists primary_color text not null default '#c2410c',
  add column if not exists primary_foreground text not null default '#ffffff',
  add column if not exists accent_color text not null default '#f97316',
  add column if not exists background_color text not null default '#ffffff',
  add column if not exists surface_color text not null default '#fff7ed';

update public.restaurant_settings
set
  tagline = coalesce(tagline, 'Order food for pickup or delivery'),
  primary_color = coalesce(primary_color, '#c2410c'),
  primary_foreground = coalesce(primary_foreground, '#ffffff'),
  accent_color = coalesce(accent_color, '#f97316'),
  background_color = coalesce(background_color, '#ffffff'),
  surface_color = coalesce(surface_color, '#fff7ed')
where true;

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "Admins upload branding" on storage.objects;
create policy "Admins upload branding"
  on storage.objects for insert
  with check (bucket_id = 'branding' and private.is_admin());

drop policy if exists "Admins update branding" on storage.objects;
create policy "Admins update branding"
  on storage.objects for update
  using (bucket_id = 'branding' and private.is_admin());

drop policy if exists "Admins delete branding" on storage.objects;
create policy "Admins delete branding"
  on storage.objects for delete
  using (bucket_id = 'branding' and private.is_admin());

-- Public bucket object URLs work without a listing SELECT policy
