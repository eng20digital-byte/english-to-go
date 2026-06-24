// Brand palette for the admin UI. These are the authoritative hex values;
// the same palette is exposed as CSS custom properties in index.css
// (--brand-*) and as shadcn design tokens (--primary, --accent, etc.) so
// every layer — shadcn components, Tailwind utilities, and inline styles —
// all draw from one source of truth.
//
// Usage: import BRAND and reference values in inline style objects.
// For Tailwind arbitrary values: bg-[var(--brand-green)] etc.
export const BRAND = {
  green:      '#59B292', // page/nav background, focus rings, accent
  greenDark:  '#4a9a7d', // hover/active state for green elements
  yellow:     '#FFC94D', // primary CTA button
  yellowDark: '#e6b340', // hover state for yellow
  cream:      '#FAE7CB', // card / form background
  creamLight: '#fff8ef', // input wells, lighter surfaces
  pink:       '#FA6781', // secondary accent, error/destructive
  text:       '#1a1a1a',
  textMuted:  'rgba(26,26,26,0.55)',
} as const;

export type BrandColorKey = keyof typeof BRAND;
