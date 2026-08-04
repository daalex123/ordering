-- Distinguish auth vs order OTP challenges; scope lookups by purpose
alter table public.otp_challenges
  add column if not exists purpose text not null default 'auth';

alter table public.otp_challenges
  drop constraint if exists otp_challenges_purpose_check;

alter table public.otp_challenges
  add constraint otp_challenges_purpose_check
  check (purpose in ('auth', 'order'));

create index if not exists otp_challenges_phone_purpose_created_idx
  on public.otp_challenges (phone, purpose, created_at desc);

comment on column public.otp_challenges.purpose is
  'OTP use case: auth (signup) or order (checkout confirmation).';

-- Orders must be created via server OTP verify (service role), not client insert
drop policy if exists "Customers create own orders" on public.orders;
drop policy if exists "Customers insert items for own orders" on public.order_items;
