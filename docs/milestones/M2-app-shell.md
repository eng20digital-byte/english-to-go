# M2 — App Shell & Deployment

## Goal
A single deployed SPA with both route trees wired up and real Supabase auth working end-to-end, before any real feature is built.

## Scope
- `src/lib/supabaseClient.ts` — single Supabase client instance using env vars.
- `src/lib/queryClient.ts` — React Query client + `<QueryClientProvider>` in `main.tsx`.
- `src/auth/AuthContext.tsx` — wraps `supabase.auth.onAuthStateChange`, exposes session/user/admin status.
- `src/auth/RequireAuth.tsx` — route guard: redirects to `/admin/login` if no session.
- `App.tsx` — React Router setup: `/admin/*` (guarded, placeholder dashboard), `/admin/login` (real login form), `/b/:token` (placeholder "booklet here" page).
- `public/_redirects` with `/* /index.html 200` for Cloudflare Pages SPA fallback.
- Connect repo to Cloudflare Pages (or document manual deploy steps if not connected to git remote yet), confirm a live build.

## Out of scope
No booklet data, no real reader/editor content — placeholders only. Styling is minimal/functional, not polished.

## Manual verification
1. `npm run dev` locally: visiting `/admin` redirects to `/admin/login` when logged out.
2. Log in with the admin account created in M1 — redirected to `/admin`, placeholder dashboard shown.
3. Log out — redirected back to `/admin/login`.
4. Visit `/b/anything` while logged out — placeholder page loads without redirect (public route).
5. On the deployed Cloudflare Pages URL, repeat steps 1–4 and additionally confirm a hard refresh on `/admin/login` and `/b/anything` doesn't 404 (SPA fallback working).
