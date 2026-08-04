-- Telegram channel binding for admin order alerts (single restaurant)

alter table public.restaurant_settings
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_alerts_enabled boolean not null default false,
  add column if not exists telegram_link_code text,
  add column if not exists telegram_link_expires_at timestamptz,
  add column if not exists telegram_channel_title text;
