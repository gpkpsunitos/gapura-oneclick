# Mobile Bottom Navigation Equal Spacing Design

## Objective

Make the mobile bottom navigation look precise at every supported viewport width by giving every visible control the same horizontal layout track. Preserve the existing visual language and all navigation behavior.

## Problem

`MobileBottomNav` currently lays out non-primary destinations with `flex-1`, while the primary Create action uses an intrinsic-width wrapper. Because the children do not participate in the same sizing rule, their center points are unevenly spaced. The first interval is visibly wider in the four-item configuration shown in the reference screenshot.

## Considered Approaches

1. **Dynamic equal-track grid (selected):** use one equal-width CSS Grid column per rendered nav item. This produces mathematically equal center-to-center spacing and adapts automatically to role-based item counts.
2. **Absolutely centered Create action:** lock Create to the center of the bar and distribute other destinations around it. This does not produce balanced spacing when the number of destinations on each side differs and increases overlap risk.
3. **Manually tuned flex widths:** adjust padding or per-item widths until the reference viewport looks balanced. This is fragile across device widths, labels, and role-specific configurations.

## Selected Design

The inner navigation row becomes a CSS Grid. Its inline `gridTemplateColumns` value is derived from `navItems.length` as `repeat(n, minmax(0, 1fr))`. Every mapped child therefore occupies exactly one track, including the primary Create wrapper.

Each child remains centered within its own track. The primary action retains its raised vertical offset, circular styling, shadow, and white border. Non-primary items retain their icon, label, active color, active dot, and press feedback.

No nav item order, route, active-state matching, menu behavior, visibility-on-scroll behavior, container size, or role logic changes.

## Responsive and Accessibility Requirements

- Equal track widths must hold for all role-dependent item counts currently produced by `navItems`.
- The existing mobile and `sm` dimensions remain unchanged.
- Interactive controls retain semantic `button` elements and accessible labels.
- The Create button receives a full-track wrapper while preserving a minimum 44 by 44 pixel tap target.
- The layout must not overflow at a 375-pixel viewport or in portrait tablet widths below the existing `xl` cutoff.

## Implementation Scope

Only `components/MobileBottomNav.tsx` needs a behavioral layout change. The flex distribution classes on the inner row are replaced by grid alignment, and the number of equal columns is supplied from the existing `navItems` array. The primary wrapper is centered within its assigned cell.

No new dependency, component, token, route, or global stylesheet is required.

## Verification

1. Run ESLint against `components/MobileBottomNav.tsx`.
2. Run the production build or the narrowest available TypeScript validation.
3. Visually inspect the four-item configuration at a small phone width and confirm identical center-to-center intervals.
4. Verify at least one three-item and one five-item role configuration to ensure the dynamic grid remains proportional.
5. Confirm Create and Menu remain tappable and active-route highlighting is unchanged.

