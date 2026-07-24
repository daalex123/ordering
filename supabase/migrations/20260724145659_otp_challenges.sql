-- Phone OTP challenges (service-role only; no client policies)
create table public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index otp_challenges_phone_created_idx
  on public.otp_challenges (phone, created_at desc);

create index otp_challenges_expires_idx
  on public.otp_challenges (expires_at);

alter table public.otp_challenges enable row level security;

-- Unique phone on profiles for lookup (empty string allowed for legacy rows)
create unique index if not exists profiles_phone_unique_idx
  on public.profiles (phone)
  where phone is not null and length(trim(phone)) > 0;

comment on table public.otp_challenges is
  'Short-lived phone OTP hashes for TextBee verification. Access via service role only.';
