# Lavender re-skin — design spec

**Date:** 2026-07-09
**Source:** Claude Design project "Urbane Ethos" → `Urbane Ethos - Lavender.dc.html`
**Decision (via scoping questions):** Re-skin **production** (all 8 pages) → **Lavender Fields** palette → **violet CTAs** → **full port** (multicolor service cards + floating hero blobs), with **AA-safe token adjustments**.

## Goal

Replace the committed "warm" palette (cream / sage / terracotta / sun) with the imported **Lavender Fields** direction across the 8 production pages, keeping the axe-core ratchet at **0 violations** and i18n parity intact. Fonts are unchanged — production already ships Source Serif 4 (headings) + Inter (body), which is exactly what the Lavender comp uses.

Non-goals: no palette switcher (single committed look), no layout rewrite, no framework, no build step. `design/directions/v{1,2,3}` artifacts are left untouched as historical comparison material.

## Architecture context (from token-usage audit)

- CSS has **no semantic layer** — `components.css` / `base.css` reference `--color-*` tokens directly. A palette swap is mostly a token-value change plus a few targeted rule repoints.
- **`--color-ink` is overloaded**: body text **and** primary CTA background **and** footer background. A pure hex swap therefore cannot produce violet buttons (it would turn all text violet). The fix: add an explicit violet accent token and repoint the button/link/eyebrow/focus rules to it. Footer stays `--color-ink` (plum `#393350`) — which matches the comp's footer.
- Production service cards are monochrome (all `--color-cream-soft`); the hero is flat. The full port adds the comp's 6 pastel cards and animated hero blobs.

## Token mapping (`tokens.css`)

Neutrals (change values, keep names):

| Token | Warm (old) | Lavender Fields (new) | Notes |
|---|---|---|---|
| `--color-cream` | `#F6EFE3` | `#F4F0FB` | page bg (lavender) |
| `--color-cream-soft` | `#FBF6EC` | `#FFFFFF` | surface / cards / header / panels |
| `--color-alt` (NEW) | — | `#FBF7EF` | warm cream alt-section bands (`.section--alt`) |
| `--color-ink` | `#2B1F14` | `#393350` | text + footer bg |
| `--color-ink-soft` | `#4A372A` | `#5C5577` | secondary text |
| `--color-ink-muted` | `#7A6A5C` | `#6E6884` | **AA-adjusted** from comp `#8E88A2` (which fails normal-text AA everywhere it's used) |
| `--color-line` | `#E2D4BD` | `#E8E1F3` | borders/dividers |
| `--color-error` | `#B5403B` | `#B5403B` | unchanged |
| `--color-success` | `#4A6B3A` | `#4A6B3A` | unchanged (unused) |

New violet accent + comp extras (added tokens):

| Token | Value | Role |
|---|---|---|
| `--color-primary` | `#8B73D4` | soft/brand violet (blobs, hover tints, cursor dot) |
| `--color-primary-deep` | `#6F58BE` | **CTA bg, links, eyebrows, focus** — the AA-safe accent |
| `--color-primary-soft` | `#DCD2F4` | pill/tint fills |
| `--color-blue` `--color-green` `--color-pink` `--color-sun-accent` | `#AFC6E8` `#B8D6C2` `#E9C6DD` `#F0D49A` | hero blobs / dots |
| `--svc-1..6` | `#EAE2FB #E0EAF8 #E1EFE5 #F6E6F1 #F8EFDD #E8E3F6` | service-card backgrounds |
| `--svc-d-1..6` | `#8B73D4 #6E97D8 #6FA98A #C77FA8 #CCA45E #7E72C4` | service-card icon chips |
| `--av-a/b/c` | `#CDBDF0 #B7D2E6 #BFDDC8` | staff avatar gradients |

Legacy warm names still referenced by stray rules (`--color-sage`, `--color-sage-deep`, `--color-terracotta`, `--color-terracotta-deep`, `--color-sun`) are re-pointed to on-palette lavender values so any missed reference stays in-palette, but the audited accent rules are repointed explicitly (below).

Shadows / grain: the hardcoded `rgba(43,31,20,…)` (ink-brown) shadows in `tokens.css` (`--shadow-1/2/3`) and `components.css:238,429,639`, plus the warm `rgba(120,80,40,…)` paper-grain in `base.css:68-70`, retint to plum `rgba(57,51,80,…)` to match the comp's shadow color.

## Accent repoints (`base.css` / `components.css`)

Point these audited rules at `--color-primary-deep` (or `--color-primary` for soft/decorative):

- `.btn--primary` bg + hover, `.btn--secondary:hover` fill — CTA violet (was `--color-ink`)
- global link color (`base.css`), nav hover / current-page, hero eyebrow, FAQ open summary (was `--color-terracotta-deep`)
- focus outline + form focus ring (was `--color-sun`) → `--color-primary-deep`
- chatbot launcher, chip-pill active, locale-toggle active, skip-link (was `--color-ink`) → `--color-primary-deep`
- consent banner accent / saved indicator (was `--color-sage-deep`) → `--color-primary-deep`
- canggih cursor dot (was `--color-sage`) → `--color-primary`
- `.section--alt` background → `--color-alt` (new cream band); hero gradient top uses `--color-cream` (lavender)

## Distinctive elements (full port)

1. **Multicolor service cards** — home services grid (`index.html` JS render ~L270) and `services.html` service blocks get an added icon-chip element; CSS colors card bg + chip by `:nth-child(1..6)` using `--svc-*` / `--svc-d-*`. Body text stays `--color-ink` / `--color-ink-soft` (contrast ≥ 5.5 on every tint — verified).
2. **Floating hero blobs** — add `aria-hidden` decorative circles to the home hero (`index.html`) with `uevFloat` / `uevFloat2` keyframes in `motion.css`, gated by the existing `prefers-reduced-motion` guard.

## Accessibility (WCAG AA — verified numerically)

Adjustments were chosen from computed contrast ratios, not by eye:

- `--color-ink-muted #6E6884`: ≥ 4.70 on bg, 4.94 on alt, 5.28 on surface (comp's `#8E88A2` was 3.0–3.4 → fail).
- CTA = `--color-primary-deep #6F58BE`: white text 5.50 (comp's `#8B73D4` = 3.82 → fail).
- Links `#6F58BE`: 4.90 on bg, 5.15 on alt, 5.50 on surface.
- Focus ring `#6F58BE` on bg: 4.90 (≥ 3:1 for UI).
- Body/heading `--color-ink #393350` on every service tint: ≥ 9.5.

Verification after implementation: axe-core sweep (`wcag2a wcag2aa wcag22aa`) on all 8 production pages must report **0 violations**; `bin/check-i18n-parity.rb` must pass (no content keys touched).

## Files touched

- `assets/css/tokens.css` — palette values + new tokens + shadow retint
- `assets/css/base.css` — link color, focus, grain retint, skip-link
- `assets/css/components.css` — accent repoints, `.section--alt`, service-card nth-child, shadow rgba
- `assets/css/motion.css` — `uevFloat` keyframes
- `index.html` — hero blobs markup + service-card chip in JS render
- `services.html` — service-block chip
- Other 6 pages inherit via tokens — **no per-page edits expected**

## Rollback

Single-commit revert restores the warm palette; no content, routing, or JS-logic changes are involved.
