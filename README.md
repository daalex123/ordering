# Spice Route Kitchen — Food Ordering PWA

Single-restaurant food ordering app with:

- **Customer PWA** — menu, cart, checkout (pickup/delivery), live order tracking, history, profile
- **Restaurant admin** — dashboard, live order board, menu CRUD, settings
- **Supabase** — Postgres, Auth, RLS, Realtime, Storage

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (`@supabase/ssr`)
- PWA via Serwist (production builds)
- Zustand cart (persisted)

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Supabase project URL and anon key.

### 2. Database

This app is linked to the Supabase project **foodies** (`nszaopfaeusqpkqhckar`).

Migrations are already applied remotely. Local history matches:

- `20260723182935_initial_schema`
- `20260723183008_security_harden_functions`
- `20260723183210_move_helpers_to_private_schema`

To push future migrations:

```bash
npx supabase db push --linked
```

### 3. Create an admin user

1. Sign up in the app (`/auth`) with your admin email.
2. In Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'you@example.com'
);
```

Staff users: set `role = 'staff'`.

### 4. Auth settings

In Supabase Auth → Providers, enable Email. For local/dev, disable “Confirm email” so signup works immediately.

### 5. Run

```bash
npm run dev
```

Dev and build use webpack (`--webpack`) so Serwist PWA works with Next.js 16.

- Customer app: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin) (admin/staff only)

### 6. Production PWA

```bash
npm run build && npm start
```

Serwist service worker is disabled in `next dev` (Turbopack). Installable PWA works on production builds.

Deploy the Next.js app to **Vercel** and keep Supabase as the backend. Set the same env vars in Vercel.

## App routes

| Route | Description |
|-------|-------------|
| `/` | Menu (search + categories) |
| `/product/[id]` | Product detail |
| `/cart` | Cart |
| `/checkout` | Place order |
| `/orders` | Order history |
| `/orders/[id]` | Live tracking |
| `/profile` | Profile + sign out |
| `/auth` | Sign in / sign up |
| `/admin` | Dashboard |
| `/admin/orders` | Live order board |
| `/admin/menu` | Menu management |
| `/admin/settings` | Restaurant settings |

## Payments (v1)

Cash on delivery / pay at pickup only. Card payments (Stripe) are out of scope for v1.

## Security notes

- All tables use RLS
- Roles live in `profiles.role` (not user metadata)
- Role changes are blocked for non-admins via trigger
- Never put the service role key in `NEXT_PUBLIC_*` vars
