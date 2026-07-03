// Shared style tokens for the admin page shell — the cream→yellow→pink card
// palette, focus-ring inputs, and the yellow submit button, all previously
// copy-pasted across LoginPage / DashboardPage / BookletListPage /
// FontManagerPage / MediaLibraryPicker. Raw brand hex values live in
// src/config/theme.ts (BRAND); this only composes them into reusable styles.
import { type CSSProperties } from 'react';
import { BRAND } from '@/config/theme';

// The admin chrome font — set inline on the root and on form controls so the
// look is identical whether or not a browser default would otherwise apply.
export const ADMIN_FONT =
  'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

// Standard padded-page inset (dashboard/library/media/font pages).
export const ADMIN_PAGE_PADDING = '28px 32px 64px';

// Cycling color palette for admin cards — cream → yellow → pink → repeat.
// Merged from the two former per-page copies (BookletListPage's full card
// palette + FontManagerPage's badge palette); each consumer reads the subset
// of fields it needs.
export interface CardPalette {
  bg: string;
  text: string;
  textMuted: string;
  iconBg: string;
  iconColor: string;
  separatorColor: string;
  chipBg: string; // inset surface for the public-link chip
  neutralBtnBg: string;
  neutralBtnBgHover: string;
  neutralBtnText: string;
  badgeBg: string; // weight badge on the font specimen row
  badgeText: string;
}

export const CARD_COLORS: CardPalette[] = [
  {
    bg: BRAND.cream,
    text: BRAND.text,
    textMuted: BRAND.textMuted,
    iconBg: BRAND.green,
    iconColor: '#fff',
    separatorColor: 'rgba(0,0,0,0.08)',
    chipBg: 'rgba(0,0,0,0.045)',
    neutralBtnBg: 'rgba(0,0,0,0.07)',
    neutralBtnBgHover: 'rgba(0,0,0,0.13)',
    neutralBtnText: BRAND.text,
    badgeBg: BRAND.green,
    badgeText: '#fff',
  },
  {
    bg: BRAND.yellow,
    text: BRAND.text,
    textMuted: 'rgba(26,26,26,0.6)',
    iconBg: 'rgba(0,0,0,0.09)',
    iconColor: BRAND.text,
    separatorColor: 'rgba(0,0,0,0.1)',
    chipBg: 'rgba(0,0,0,0.06)',
    neutralBtnBg: 'rgba(0,0,0,0.09)',
    neutralBtnBgHover: 'rgba(0,0,0,0.16)',
    neutralBtnText: BRAND.text,
    badgeBg: 'rgba(0,0,0,0.10)',
    badgeText: BRAND.text,
  },
  {
    bg: BRAND.pink,
    text: '#fff',
    textMuted: 'rgba(255,255,255,0.72)',
    iconBg: 'rgba(255,255,255,0.22)',
    iconColor: '#fff',
    separatorColor: 'rgba(255,255,255,0.2)',
    chipBg: 'rgba(255,255,255,0.16)',
    neutralBtnBg: 'rgba(255,255,255,0.2)',
    neutralBtnBgHover: 'rgba(255,255,255,0.32)',
    neutralBtnText: '#fff',
    badgeBg: 'rgba(255,255,255,0.22)',
    badgeText: '#fff',
  },
];

// Base chrome for the small pill buttons on booklet cards / empty-state actions.
export const BTN_BASE: CSSProperties = {
  border: 'none',
  borderRadius: 12,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background-color 0.16s',
  fontFamily: 'inherit',
  lineHeight: 1,
};

// The floating-card resting/hover drop shadow shared by the dashboard action
// cards and the booklet cards.
export function cardShadow(hovered: boolean): string {
  return hovered
    ? '0 20px 50px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.12)'
    : '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)';
}

// Cream focus-ring input. `overrides` covers the small per-form differences
// (login's larger padding/size + ltr direction, the toolbar's flex sizing)
// without forking the shared focus-ring/color/transition behavior.
export function inputStyle(focused: boolean, overrides?: CSSProperties): CSSProperties {
  return {
    backgroundColor: BRAND.creamLight,
    border: `2px solid ${focused ? BRAND.green : 'transparent'}`,
    borderRadius: 12,
    padding: '11px 14px',
    fontSize: 14,
    outline: 'none',
    boxShadow: focused ? '0 0 0 4px rgba(89,178,146,0.18)' : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    color: BRAND.text,
    width: '100%',
    fontFamily: 'inherit',
    ...overrides,
  };
}

// Yellow primary submit button. Shared chrome + hover/active/pending behavior;
// `overrides` covers each form's own padding/size/layout (icon+label flex,
// full-width, etc.).
export function submitButtonStyle(
  state: { hover: boolean; active: boolean; pending: boolean },
  overrides?: CSSProperties,
): CSSProperties {
  const { hover, active, pending } = state;
  return {
    backgroundColor: hover || pending ? BRAND.yellowDark : BRAND.yellow,
    color: BRAND.text,
    border: 'none',
    borderRadius: 14,
    fontWeight: 700,
    letterSpacing: '0.2px',
    cursor: pending ? 'not-allowed' : 'pointer',
    transform: active && !pending ? 'scale(0.975)' : 'scale(1)',
    transition: 'background-color 0.16s, transform 0.1s',
    fontFamily: 'inherit',
    ...overrides,
  };
}
