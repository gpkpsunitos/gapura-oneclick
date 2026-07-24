# DESIGN.md — Gapura OneClick

Design rules for the OneClick redesign. **Obey these every time UI is touched.** This is a
redesign of the *existing* product (auth + operational dashboards), not a new product. Preserve
real content, routes, flows, and Bahasa/English copy unless something is clearly broken.

### Confirmed scope (locked with product owner)

- **Primary target: OP Dashboard** (`/dashboard/op`, the Analytics Center / report list). Full
  redesign — new fonts, new palette, editorial rebuild.
- **Fonts (dashboard/app scope): Bricolage Grotesque (display) + Hanken Grotesk (body)**, both
  loaded via `next/font/google` (zero new files, same pattern as the current Plus Jakarta setup).
  Mono = JetBrains Mono. (Self-hosted Fontshare faces were rejected as too complicated.)
- **Palette: Gapura Green (dominant) + Signal Amber (accent)**, purple/indigo banned.
- **Auth (login + register): keep the current font (Plus Jakarta Sans) AND current color palette.**
  Only redesign the **mobile / tablet viewport** layout (`< lg`). **Do not touch desktop auth**
  and do not restyle auth colors/fonts. The new Cabinet/General Sans faces are therefore scoped so
  they do NOT leak into `.auth-route` (which keeps `--font-display`/`--font-body` = Plus Jakarta).

---

## 0. Aesthetic direction (committed)

**Operational Editorial — warm-technical.**

Not "modern and clean". The product is an airport ground-handling *irregularity reporting*
system used by ops staff on phones on the ramp and by managers at a desk. It handles serious
content (a passenger death report sits next to a baggage misroute). So: **calm warm paper +
near-black editorial ink + one confident Gapura green + mono for the machine data** (flight
numbers, routes, station codes, NIK, timestamps). Severity is a functional signal scale, never
decoration.

The current dashboard already gestures at this (cream substrate, big black `Analytics Center`
headline, green pills). We commit to it fully and make the auth pages match — right now the auth
pages read like a generic SaaS template and the dashboard reads editorial; they should feel like
one product.

Anti-goals: corporate-bland, AI-template, glassmorphism-everywhere.

---

## 1. Typography

One display + one body + one mono. **Never Inter, Roboto, Open Sans, Arial, system-ui** as a
brand face (system stack allowed only as the invisible fallback in `font-family`).

| Role | Font | Use |
|------|------|-----|
| **Display** | **Bricolage Grotesque** (`next/font/google`) | Headlines, page titles, big numbers, section labels. Weights 700–800. |
| **Body** | **Hanken Grotesk** (`next/font/google`) | All prose, labels, inputs, buttons. Weights 400/500/600. Body text **≥16px**. |
| **Mono** | **JetBrains Mono** (already in repo) | Flight codes (`QG987/QG762`), routes (`PLM-CGK-SOC`), station codes, NIK, timestamps, IDs. |

Both new faces are Google Fonts loaded exactly like the existing `Plus_Jakarta_Sans` import in
`app/layout.tsx` — no self-hosting, no font files. NOT the banned set, NOT Space Grotesk.

Hierarchy comes from **weight extremes + clear size jumps**, not borders:
- Display 800 at `clamp(2rem…3.25rem)` for page titles (`Analytics Center`, `Welcome Back`).
- Body 400 at 16px, tracking normal.
- Section eyebrows: mono/uppercase, 12px, `letter-spacing: 0.14em`, `--text-muted`.
- Never more than 3 weights visible in one view.

Wire the two new faces into the existing token seam — set `--font-display` / `--font-body` in
`app/globals.css`; do **not** scatter font-family declarations in components. **Scope guard:**
`.auth-route` must pin `--font-display`/`--font-body` back to Plus Jakarta Sans so auth keeps its
current type (see Confirmed scope).

---

## 2. Color

**ONE dominant + ONE accent**, both as CSS variables in `app/globals.css` (`:root`). The oklch
token system (PRISM V3) already exists — extend it, don't replace it.

- **Dominant — Gapura Green.** The brand. Deep green ink for primary CTAs and active state;
  brighter emerald reserved for small accents/rings. Approx `--brand-primary: oklch(0.55 0.14 162)`
  (deep) with emerald 500 `oklch(0.65 0.18 160)` for highlights.
- **Accent — Signal Amber**, ONE only, `~oklch(0.78 0.16 78)`. Used sparingly for attention/warm
  emphasis (e.g. the "Quick Access" affordance, empty states), never as a second brand.
- **Substrate — warm paper**, not pure white. Keep the existing warm off-whites
  (`--surface-*`, hue 90). Pure `#fff` only for raised cards.
- **Ink** — near-black `--text-primary: oklch(0.16 0.01 250)`; secondary/muted already defined.

**Severity / status = a semantic scale, not brand color.** LOW→green, MEDIUM→amber, HIGH→red,
CLOSED→muted green, OPEN→red. Use `--status-*` tokens. Must be legible AA and not rely on hue
alone (pair with label text — already the case).

**Bans:**
- No purple/indigo. Remove `accent-purple` from UI use — the current route pills (`PLM-CGK-SOC`)
  and category pills are purple/blue; recolor to neutral-ink chips + mono, keeping meaning.
  (Applies to the **dashboard**; auth palette is untouched per Confirmed scope.)
- No purple/indigo gradients on white. The one allowed green gradient is the auth hero panel and
  the primary button — keep it subtle, single hue family.

---

## 3. Spacing & layout

- **8px rhythm.** All gaps/padding are multiples of 4, preferably 8 (4/8/12/16/24/32/48).
  Use the existing `--space-*` tokens.
- Hierarchy from **type + whitespace**, not boxes. Kill redundant borders: a card should not
  have a border *and* a shadow *and* a divider *and* an inner ring. Pick one boundary cue.
- **Touch targets ≥44px.** Inputs and buttons min-height 44px on mobile (current inputs are
  `py-2.5` ≈ 40px — bump).
- Asymmetry is welcome: the auth split (green story panel / form) and the dashboard's
  ranked report list are good bones — keep them, tighten rhythm.

---

## 4. Motion

**One system, subtle.** A single orchestrated entrance (staggered fade-up on load) + honest
state feedback (focus ring, button press, loading spinner). No scattered micro-animations.
Reuse existing keyframes (`fadeInUp`, `block-enter`, `tr-enter`) and `framer-motion` where already
imported. Respect `prefers-reduced-motion`. Emergency/high-severity may use the existing
`emergency-pulse` — sparingly.

---

## 5. Components — reuse first

The repo has primitives. **Prefer them; flag anything new.**

- Inputs/selects/buttons: `components/ui/PrismInput.tsx`, `PrismSelect.tsx`, `PrismMultiSelect.tsx`,
  `PrismButton.tsx`, `button.tsx`. **The auth pages currently hand-roll inputs/buttons with raw
  Tailwind and ignore these primitives — reconcile onto the primitives** (biggest consistency win).
- Cards/surfaces: `GlassCard.tsx`, `NoiseTexture.tsx`.
- Overlays: `sheet.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `ConfirmDialog.tsx`, Radix already
  installed.
- Tables/reports: `report-table.tsx`, `components/dashboard/*`.
- Import alias is `@/…`. Tailwind tokens: `bg-surface-1`, `text-text-primary`, `text-brand-primary`,
  `font-display`, `font-mono`, `rounded-prism`, `shadow-spatial-*`.

Any genuinely new component must be called out in the plan with a reason it can't reuse.

---

## 6. Accessibility (non-negotiable)

- WCAG **AA** contrast for all text and UI state.
- Body **≥16px**; never render primary content below 14px.
- Visible **focus states** on every interactive element (`:focus-visible`, brand ring already in
  `auth-theme.css` — keep and apply consistently).
- Touch targets **≥44×44px**.
- Labels tied to inputs; icons decorative-only get `aria-hidden`; status not by color alone.
- Preserve `lang`, existing `aria-*`/`aria-pressed` on the password toggle.

---

## 7. Forbidden (AI-default tells — never ship these)

- 3 equal rounded cards in a row.
- Centered-everything hero.
- Glassmorphism as the primary surface language.
- Emoji feature cards.
- 0.1-opacity drop shadow on *everything* (pick real elevation levels: `--shadow-spatial-*`).
- Generic "Feature 1 / 2 / 3" copy — use the product's real content.
- Purple/indigo gradient on white.
- Inter / Roboto / Open Sans / Arial / system-ui as a brand face.

---

## 8. What NOT to change

- Brand meaning: Gapura green, the "One Click" name, the logo, `© Gapura Angkasa`.
- Core flows: login → role redirect, register field logic (KPS divisions, jabatan rules,
  station-first gating), report list → change status / download.
- Real copy (Bahasa + English) and field labels, unless explicitly asked.
- Routes, data contracts, server queries.
