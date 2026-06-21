# M0 — Repo & Tooling Scaffold

## Goal
A working Vite + React + TypeScript app with the libraries and conventions every later milestone depends on, and nothing else.

## Scope
- `npm create vite@latest` (React + TypeScript template)
- Install: `react-router-dom`, `@supabase/supabase-js`, `@tanstack/react-query`, `zod`
- ESLint + Prettier baseline config
- `src/config/` directory created (empty placeholder + a `canvas.ts` with the 1080×1920 constants, since canvas size is the first magic-number candidate)
- `.env.example` documenting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (no real values committed)
- `.gitignore` covering `node_modules`, `dist`, `.env`, `.env.local`
- Base folder skeleton from the plan's folder structure (empty directories with a `.gitkeep` or stub index where needed): `src/lib/`, `src/types/`, `src/auth/`, `src/renderer/`, `src/tts/`, `src/quiz/`, `src/admin/`, `src/reader/`, `src/components/`, `src/hooks/`, `src/config/`

## Out of scope
No Supabase project, no routing logic, no real components yet — those start in M1/M2.

## Manual verification
1. `npm install`
2. `npm run dev` — app loads the default Vite starter page with no console errors
3. `npm run lint` — passes
4. Confirm `.env` is git-ignored (`git status` after creating a dummy `.env` shows it untracked... actually ignored entirely)
