---
name: Spice Route Kitchen — Glass Storefront
description: Dark warm glassmorphism ordering UI for Home and Product
colors:
  glass-bg: "#1A120E"
  glass-bg-deep: "#0E0A08"
  glass-bg-mid: "#2A1A12"
  glass-bg-low: "#120C09"
  glass-bg-lowest: "#0A0705"
  glass-surface: "rgba(255, 255, 255, 0.10)"
  glass-surface-strong: "rgba(255, 255, 255, 0.14)"
  glass-surface-soft: "rgba(255, 255, 255, 0.08)"
  glass-border: "rgba(255, 255, 255, 0.18)"
  glass-text: "#FFFFFF"
  glass-muted: "rgba(255, 255, 255, 0.62)"
  glass-accent: "#FF8A00"
  glass-accent-bright: "#FF9A1F"
  glass-accent-hot: "#E95322"
  glass-danger: "#FF4D4F"
  glass-shadow: "rgba(0, 0, 0, 0.28)"
  glass-shadow-soft: "rgba(0, 0, 0, 0.20)"
  glass-shadow-deep: "rgba(0, 0, 0, 0.35)"
  glass-accent-glow: "rgba(255, 138, 0, 0.35)"
  glass-accent-wash: "rgba(255, 138, 0, 0.28)"
  glass-hot-wash: "rgba(233, 83, 34, 0.22)"
  glass-inset: "rgba(255, 255, 255, 0.12)"
  glass-inset-strong: "rgba(255, 255, 255, 0.14)"
  glass-inset-bright: "rgba(255, 255, 255, 0.25)"
  yum-yellow: "#F5CB58"
  admin-blue: "#4880FF"
  admin-ink: "#202224"
  admin-muted: "#606060"
  admin-canvas: "#F5F6FA"
  admin-panel: "#FFFFFF"
  admin-line: "#E0E2E7"
  admin-line-soft: "#E6E8EF"
  admin-success: "#00B69B"
  admin-danger: "#F93C65"
  admin-warn: "#FCBE2D"
  admin-reject: "#FD5454"
  admin-icon-purple: "#8280FF"
  admin-icon-yellow: "#FEC53D"
  admin-icon-green: "#4AD991"
  admin-icon-orange: "#FF9066"
  admin-tint: "#EEF3FF"
  admin-muted-fill: "#F1F4F9"
  admin-shadow: "rgba(32, 34, 36, 0.04)"
typography:
  display:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  product-title:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  price-lg:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  title-sm:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  body-sm:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  caption:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  micro:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  badge:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  meta:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  badge-sm:
    fontFamily: "League Spartan, ui-sans-serif, system-ui, sans-serif"
    fontSize: "9px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  sm: "12px"
  md: "20px"
  lg: "28px"
  xl: "32px"
  admin: "14px"
  pill: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.glass-accent}"
    textColor: "{colors.glass-text}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  glass-panel:
    backgroundColor: "{colors.glass-surface}"
    textColor: "{colors.glass-text}"
    rounded: "{rounded.lg}"
---

# Design System — Glass Storefront

## Overview

Customer Home and Product use a **dark warm glassmorphism** language: frosted translucent panels over a deep amber/brown atmospheric field, with a single vibrant orange accent for CTAs and active states. Admin remains on the separate light DashStack kit (tokens prefixed `admin-` above).

## Colors

- Atmosphere is dark (`#1A120E` → deeper vignette), never flat black.
- Glass fills are white at ~8–14% opacity; borders white ~18%.
- Orange (`#FF8A00`, or restaurant `primary_color` when set) owns CTAs, selected chips, prices, and active nav.
- Secondary copy is lightened white (~62% opacity), not gray-on-dark mud.

## Typography

League Spartan for display and UI. Hierarchy via weight and size: greeting ~14–16, hero headline ~30–32, section titles ~18–20, body ~13–14.

## Layout

Mobile column `max-w-lg` centered. Home: header → search → categories → promo → Popular Now. Product: hero image upper half, glass detail sheet lower half, sticky action bar. Bottom nav floats above safe area.

## Elevation & Depth

Glass = `backdrop-filter: blur(20px)` + translucent fill + 1px light border + soft large shadow. Food photography sits above glass; glass never wraps the hero as a card inset.

## Shapes

Large radii (20–28px) on panels and CTAs; circular icon buttons (~44px); category tiles rounded squares (~16–20px). Admin panels use 14px.

## Components

- **Glass panel / card:** frosted surface, thin border, soft shadow.
- **Primary CTA:** solid orange (optional subtle gradient), bold white label.
- **Search:** pill glass field with search + filter affordances.
- **Category tile:** glass square; selected = orange fill.
- **Bottom nav:** floating glass bar; active icon orange.
- **Qty stepper:** glass pill with ±.
- **Size chips:** pill; selected orange fill.

## Do's and Don'ts

- Do keep glass materials on interactive/content panels over the atmospheric field.
- Do use real product images and prices.
- Don't reintroduce the legacy YumQuick yellow/cream kit on Home/Product.
- Don't apply glass blur as empty decoration with no content.
- Don't restyle admin into glass without an explicit ask.
