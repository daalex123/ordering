# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hungry guests ordering from a single restaurant on mobile (often as an installed PWA), typically while deciding what to eat and tracking an order. Restaurant admins/staff manage the live order board, menu, and settings on a separate light admin surface.

## Product Purpose

Let guests browse the menu, customize items, checkout for pickup or delivery, and track order status in real time. Success is a fast path from craving → cart → confirmed order, with clear status afterward.

## Positioning

Single-restaurant ordering PWA tied to live kitchen operations (Supabase Realtime, staff order board), not a multi-vendor marketplace.

## Operating Context

Mobile-first storefront; optional PWA install. Auth via phone OTP / email. Cart persisted client-side. Admin uses a separate DashStack-style light kit.

## Capabilities and Constraints

- Customer: menu browse/search, product portions & notes, cart, checkout, order history/tracking, profile.
- Admin: dashboard, live orders, menu CRUD, branding/settings.
- Scope decision (2026-07-31): premium glassmorphism redesign ships first on **Home + Product detail**; other customer routes inherit the glass shell but are not fully restyled yet. Admin stays on the light theme.

## Brand Commitments

- Restaurant brand name/logo/tagline come from `restaurant_settings` (default: Kings Bakamuna).
- User-pinned storefront aesthetic: **premium dark warm glassmorphism** with orange CTAs (mock reference provided 2026-07-31).

## Evidence on Hand

- Live menu/products/categories from Supabase.
- Brand assets under `public/` (logo, yumquick icons — glass redesign prefers Lucide / CSS over legacy kit icons where restyled).
- No fabricated ratings, promo percentages, or customer testimonials; use real product data only.

## Product Principles

1. Order path stays short and obvious on a phone.
2. Kitchen truth (availability, open/closed, portions) beats decorative chrome.
3. Brand colors from settings tint CTAs; glass materials stay consistent.
4. Admin operational clarity is separate from guest atmosphere.
