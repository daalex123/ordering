-- Human-friendly kitchen ticket numbers (instead of UUID hex fragments)
create sequence if not exists public.orders_order_number_seq;

alter table public.orders
  add column if not exists order_number bigint;

-- Backfill existing orders in created order
with numbered as (
  select
    id,
    row_number() over (order by created_at asc) as n
  from public.orders
  where order_number is null
)
update public.orders o
set order_number = numbered.n
from numbered
where o.id = numbered.id;

select setval(
  'public.orders_order_number_seq',
  greatest(coalesce((select max(order_number) from public.orders), 1), 1),
  true
);

alter table public.orders
  alter column order_number set default nextval('public.orders_order_number_seq');

alter table public.orders
  alter column order_number set not null;

alter sequence public.orders_order_number_seq owned by public.orders.order_number;

create unique index if not exists orders_order_number_uidx
  on public.orders (order_number);
