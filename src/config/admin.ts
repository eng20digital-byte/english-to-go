// Admin chrome layout constants (dashboard, library, etc.) — kept out of the
// components per the code-quality bar's "no magic values in components" rule.

// Below this viewport width the dashboard's action-card grid collapses from
// two columns to a single stacked column. Picked a touch above the reader's
// 640 breakpoint because the dashboard's 2fr/1fr split gets cramped before a
// phone-width viewport (the Fonts card loses too much room first).
export const ADMIN_DASHBOARD_STACK_BREAKPOINT = 720;
