/**
 * Breakpoint constants for responsive design
 * Following mobile-first approach
 */

export const BREAKPOINTS = {
  /** Extra small devices (phones, 375px and up) */
  XS: 375,
  /** Small devices (large phones, 640px and up) */
  SM: 640,
  /** Medium devices (tablets, 768px and up) */
  MD: 768,
  /** Large devices (laptops/desktops, 1024px and up) */
  LG: 1024,
  /** Extra large devices (large laptops, 1280px and up) */
  XL: 1280,
  /** 2X Extra large devices (large monitors, 1536px and up) */
  '2XL': 1536,
} as const;

/**
 * Tailwind breakpoint classes for reference
 */
export const TAILWIND_BREAKPOINTS = {
  XS: '',           // Default (mobile-first)
  SM: 'sm:',        // 640px
  MD: 'md:',        // 768px
  LG: 'lg:',        // 1024px
  XL: 'xl:',        // 1280px
  '2XL': '2xl:',    // 1536px
} as const;

/**
 * 8pt spacing system
 * Base unit: 4px (0.25rem)
 */
export const SPACING = {
  '0': '0',
  '0.5': '0.125rem',   // 2px
  '1': '0.25rem',      // 4px
  '1.5': '0.375rem',   // 6px
  '2': '0.5rem',       // 8px
  '2.5': '0.625rem',   // 10px
  '3': '0.75rem',      // 12px
  '3.5': '0.875rem',   // 14px
  '4': '1rem',         // 16px
  '5': '1.25rem',      // 20px
  '6': '1.5rem',       // 24px
  '8': '2rem',         // 32px
  '10': '2.5rem',      // 40px
  '12': '3rem',        // 48px
  '16': '4rem',        // 64px
  '20': '5rem',        // 80px
  '24': '6rem',        // 96px
} as const;

/**
 * Touch target sizes (minimum 44px)
 */
export const TOUCH_TARGETS = {
  /** Minimum touch target size (44px) */
  MIN: '2.75rem',
  /** Comfortable touch target (48px) */
  COMFORTABLE: '3rem',
  /** Large touch target (56px) */
  LARGE: '3.5rem',
} as const;

/**
 * Chart heights for different viewports
 * Using vh for responsive scaling with min-height fallback
 */
export const CHART_HEIGHTS = {
  /** Mobile charts (small screens) */
  MOBILE: {
    SM: '30vh',    // Small charts
    MD: '35vh',    // Medium charts
    LG: '40vh',    // Large charts
  },
  /** Desktop charts */
  DESKTOP: {
    SM: '240px',
    MD: '300px',
    LG: '360px',
  },
} as const;

/**
 * Responsive typography scale
 */
export const TYPOGRAPHY = {
  MOBILE: {
    XS: 'text-[10px]',
    SM: 'text-[11px]',
    BASE: 'text-xs',
    LG: 'text-sm',
    XL: 'text-base',
    '2XL': 'text-lg',
  },
  DESKTOP: {
    XS: 'text-xs',
    SM: 'text-sm',
    BASE: 'text-base',
    LG: 'text-lg',
    XL: 'text-xl',
    '2XL': 'text-2xl',
  },
} as const;