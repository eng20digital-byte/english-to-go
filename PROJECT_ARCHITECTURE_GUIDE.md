# Project Architecture Guide — Digital Booklet Platform

> A complete guide to how this project is built and **why** it is built that
> way. Every statement here is grounded in the actual source. Where something
> could not be verified from the code, it is called out explicitly.
>
> This guide is a teaching document, not a code review. It contains no
> improvement suggestions except where one is needed to explain a decision.

---

## 1. Executive Summary

### What this project does

The platform is a **two-sided system for Hebrew-speaking admins to author
English-language digital booklets** and publish them to anonymous readers via
an unguessable link.

- **Admin App** (`/admin/*`) — an authenticated visual editor. An admin builds
  booklets page-by-page: a background image plus freely positioned,
  draggable/resizable elements (text, images, vocabulary bubbles). A booklet can
  have a front cover, a back cover, and a quiz on the final page.
- **Public Reader** (`/b/:token`) — a login-free, animated "flip-book"
  presentation of a *published* booklet. Readers turn pages, click any word to
  hear it spoken aloud (browser TTS), open a per-page dictionary, and take an
  embedded quiz.

### Overall architecture

```
        ┌────────────────────── Single React SPA (Vite) ──────────────────────┐
        │                                                                      │
        │   /admin/*  ── RequireAuth ──►  Admin editor chrome  ┐               │
        │   /b/:token ──────────────────► Reader chrome        ├── PageCanvas  │
        │                                                      ┘  (SHARED,     │
        │                                                          never forked)│
        └──────────────────────────────┬───────────────────────────────────────┘
                                        │  @supabase/supabase-js (REST + Auth + Storage)
                                        ▼
        ┌──────────────────── Supabase (managed backend) ─────────────────────┐
        │  Postgres + Row-Level Security  •  Auth (email/password)             │
        │  Storage buckets (fonts, media) •  SQL RPC functions (transactions)  │
        └──────────────────────────────────────────────────────────────────────┘

        + Vercel serverless: api/keep-alive.ts (Cron every 6h → keep Supabase awake)
```

There is **no custom backend server**. The React app talks directly to Supabase;
all trust boundaries are enforced by Postgres Row-Level Security (RLS) and
`security definer` SQL functions.

### Main technologies

| Concern | Choice |
| --- | --- |
| UI framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Routing | react-router-dom 7 (client-side) |
| Server state | TanStack React Query 5 |
| Backend | Supabase (Postgres, Auth, Storage) |
| Admin UI kit | shadcn/ui + Tailwind v4 |
| Deployment | Vercel (Hobby tier) + one serverless cron |
| Validation | zod (at the save boundary) |
| Unique links | nanoid |

### High-level design philosophy

Five ideas explain almost every decision in the codebase:

1. **One rendering path, never forked.** The editor and the reader draw booklet
   pages with the *same* `PageCanvas` component. WYSIWYG is guaranteed by
   construction, not by careful duplication.
2. **A fixed virtual canvas, scaled to fit.** All geometry is stored in
   1920×1080 canvas-space pixels; a single scaling mechanism maps it to any
   screen.
3. **Structured content, not HTML.** Page content is a polymorphic list of typed
   elements (`type` + `props` JSON), so new element types are pure app-layer
   additions with zero DB migrations.
4. **The database is the security boundary.** No server code to trust — RLS +
   `security definer` RPCs decide who sees and writes what.
5. **No premature abstraction, no magic numbers.** Plain React state, config
   constants in `src/config/`, and small single-responsibility files.

---

## 2. Project Structure

### Top-level directories

| Directory | Responsibility | Never belongs here |
| --- | --- | --- |
| `src/` | The entire SPA (admin, reader, shared renderer, data layer). | Backend logic. |
| `supabase/migrations/` | Schema, RLS policies, and RPC functions as ordered SQL files. | App code. |
| `scripts/` | Build-time tooling (`convert-fonts.mjs`, TTF/OTF → WOFF2). | Runtime code. |
| `fonts/` | Source font files (input to the convert script). | Compiled fonts. |
| `api/` | Vercel serverless functions — only `keep-alive.ts`. | UI or app logic. |
| `public/` | Static assets. Contains `_redirects`, an **unused** Cloudflare leftover. | New routing config. |
| `docs/` | Milestone specs and design history. | — |
| `vercel.json` | SPA rewrites + the cron schedule for `keep-alive.ts`. | — |

### Inside `src/`

The `src/` tree is deliberately organized by **architectural role**, and the
three most important folders map directly to the "one rendering path" idea:

```
src/
  renderer/     ← SHARED. The canvas. Imported unmodified by admin AND reader.
  admin/        ← Admin chrome (editor + dashboards). Tailwind + shadcn.
  reader/       ← Public reader chrome (flip-book, nav). Plain Tailwind.
  ────────────────────────────────────────────────────────────────────────
  hooks/        ← React Query data-access hooks (the "API layer").
  types/        ← TS row types + the PageElement discriminated union.
  config/       ← Every magic number / token. No hardcoded values in components.
  auth/         ← AuthContext + RequireAuth.
  lib/          ← Supabase client, query client, image compression, utils.
  components/   ← Neutral shared UI (used by both admin and reader).
  tts/          ← Word-click speech (context + rate control).
  quiz/         ← Sandboxed quiz embed.
```

#### `src/renderer/` — the shared canvas (the crown jewel)

- **Responsibility:** turn a page's element array into positioned DOM, scaled to
  fit. It is a *pure* component: `{ page, scale, renderMode }` in, JSX out.
- **Why it exists:** it is the single source of WYSIWYG truth. Because the editor
  and reader both render it unchanged, what the admin lays out is exactly what
  the reader sees.
- **What belongs here:** rendering logic that must look identical in both modes,
  and per-element renderers registered in `elements/registry.tsx`.
- **What must NEVER belong here:** Tailwind classes, reliance on Tailwind's
  global reset, editor-only or reader-only UI (selection handles, nav arrows),
  or any second rendering path. This is a hard rule stated in `CLAUDE.md`.
- **Communicates with:** the rest of the app only through props. It reads element
  data (`types/elements.ts`) and canvas constants (`config/canvas.ts`).

#### `src/admin/` — admin chrome

- **Responsibility:** everything the authenticated admin sees — dashboard,
  booklet library, the page editor, font/media managers.
- **Why separated:** it is stylistically and functionally isolated from the
  reader; it uses shadcn/ui and Tailwind under an `#admin-root` scope.
- **Key sub-folders:** `editor/` (the whole page-editing experience),
  `shell/` (shared page frame), `booklets/`, `fonts/`.
- **What must not belong here:** rendering logic that the reader also needs
  (that goes to `renderer/`), and neutral UI reused by the reader (that goes to
  `components/`).

#### `src/reader/` — public reader chrome

- **Responsibility:** the animated presentation *around* the canvas — the 3D
  page-flip, covers, nav arrows, loading/error states, dictionary panel, and
  the audio for page turns.
- **Why separated:** the reader is anonymous, performance-sensitive, and
  animation-heavy. It uses plain Tailwind utilities under a `#reader-root`
  scope; it imports `renderer/` unmodified but adds none of its own rendering
  math.

#### `src/hooks/` — the data-access layer

- **Responsibility:** *all* Supabase reads and writes, wrapped as React Query
  hooks (`useBookletQuery`, `usePagesQuery`, `useMediaLibraryQuery`, etc.).
- **Why it exists as a layer:** it isolates every network call in one place, so
  components never call Supabase directly (except the autosave hook and auth
  context, which are special cases). This is effectively the app's "API client."

#### `src/config/` — the anti-magic-number firewall

- **Responsibility:** hold every tunable value: canvas size, autosave debounce,
  default fonts/colors, sandbox tokens, reader animation timings, brand palette.
- **Why it exists:** the code-quality bar forbids hardcoded values in
  components. A change to, say, the paste offset or the brand green is a
  one-line edit in one file.

---

## 3. Important Files

### `src/main.tsx`

Mounts React into `#root`, wrapped in `StrictMode` and the single
`QueryClientProvider`. **If removed:** nothing renders. It is the composition
root for the global React Query cache.

### `src/App.tsx`

The router. Declares the three top-level route groups and wires the global
providers (`BrowserRouter`, `TooltipProvider`, `AuthProvider`). **If removed:**
there is no route table; nothing resolves. See §4.

### `src/renderer/PageCanvas.tsx`

The single rendering implementation (74 lines). Sorts elements by `z_index`,
positions each in an absolute wrapper tagged with inert `data-element-id` /
`data-element-type` markers, and dispatches by `type` to `renderElement`.
**If removed:** both the editor preview and the reader lose all page rendering —
the most catastrophic file to delete.

### `src/renderer/useCanvasScale.ts`

Computes `scale = containerWidth / canvasWidth` using `useLayoutEffect` plus a
`ResizeObserver`. The layout effect sets the true scale *before* first paint,
which is why the canvas never flashes at `scale(0)`. Used identically by editor
and reader — the reason WYSIWYG holds across both. **If removed:** the canvas
cannot size itself to its container.

### `src/renderer/elements/registry.tsx`

The `type → component` dispatch table (`text`, `background_image`,
`vocabulary`). Adding an element type is a pure addition here plus a new variant
in `types/elements.ts`. **If removed:** `PageCanvas` cannot render any element.

### `src/types/elements.ts`

The `PageElement` discriminated union and each type's `Props` shape. This is the
contract shared by the DB (`page_elements.props` JSONB), the renderer, the
editor reducer, and the save RPC. **If removed:** the entire type-safety story
collapses.

### `src/lib/supabaseClient.ts`

Creates the one `supabase` client from Vite env vars. Every hook imports it.
**If removed:** no backend access anywhere.

### `src/auth/AuthContext.tsx`

Tracks the Supabase session and derives `isAdmin` by querying `admin_users`
(absence of a row = not admin, because RLS hides other admins' rows). **If
removed:** no auth state; `RequireAuth` cannot gate the admin app.

### `src/admin/editor/useEditorReducer.ts`

The in-memory element tree with an undo/redo snapshot stack. Selection and
text-editing state are deliberately kept *out* of this reducer so UI
interactions never create undo steps. **If removed:** no editing model, no
undo/redo.

### `src/admin/editor/useAutosave.ts`

Debounced persistence via the `save_page_elements` RPC, plus a flush-on-unmount
safety net and an awaitable `flushIfDirty`. **If removed:** edits are never
saved.

### `src/admin/editor/PageElementEditor.tsx`

The editor orchestration hub for a single page: loads elements once, owns the
reducer, selection, keyboard shortcuts, and hosts the canvas + inspector +
autosave. It is `key={pageId}`, so switching pages remounts it fresh. **If
removed:** there is no page-editing surface.

### `src/reader/ReaderBookletPage.tsx`

The reader orchestration root: resolves the booklet by token, runs the
cover/back-cover state machines, and lays out the flip-book with all overlay
chrome. **If removed:** `/b/:token` renders nothing.

### `supabase/migrations/0001_init.sql`

Defines all tables, RLS policies, the `is_admin()` function, the
`save_page_elements` / `delete_media_asset` RPCs, and the storage buckets. **If
removed:** the database has no schema and no security. This file *is* the backend.

Trivial files (barrels, `.gitkeep`, single-line utils) are intentionally omitted.

---

## 4. Routing

Routing is **client-side only** — a single SPA, not two deployments. It is
declared entirely in `src/App.tsx`:

```
BrowserRouter
└─ TooltipProvider
   └─ AuthProvider
      └─ Routes
         ├─ /admin/login          → LoginPage           (public)
         ├─ /admin/*              → RequireAuth → AdminRoutes   (gated)
         ├─ /b/:token             → ReaderBookletPage   (public, anonymous)
         └─ *                     → Navigate to /admin   (fallback)
```

### Route hierarchy

- **`/admin/*`** is a nested route group. `RequireAuth` wraps it once, then
  `AdminRoutes` (`src/admin/routes.tsx`) declares the inner tree:
  - `/admin` → `DashboardPage`
  - `/admin/booklets` → `BookletListPage`
  - `/admin/booklets/:bookletId` and `/admin/booklets/:bookletId/pages/:pageId`
    → `BookletEditorPage`
  - `/admin/fonts` → `FontManagerPage`
  - `/admin/media` → `MediaLibraryPicker`
- **`/b/:token`** is the public reader; `:token` is the booklet's random
  `public_token`.

### Protected routes

`RequireAuth` (`src/auth/RequireAuth.tsx`) reads `useAuth()`:

- while `loading` → render nothing (avoids a login flash),
- if no `session` → `<Navigate to="/admin/login">` preserving `from` location,
- otherwise → render children.

Note the gate checks **session presence**, not `isAdmin`. Being logged-in
reaches the admin chrome; the *data* is still RLS-gated, so a logged-in
non-admin sees empty results rather than an error.

### Layout structure & navigation flow

There is no nested `<Outlet>` layout; instead every admin page composes the
same shell (`AdminPageShell` + `AdminPageHeader`) itself, and the reader is a
single full-screen component. Navigation flow:

```
Login → Dashboard → Booklet Library → Booklet Editor → per-page editor
                                    → Font Manager / Media Library
Reader: open /b/:token → (cover) → spreads → (back cover + quiz)
```

The `*` fallback sends unknown paths to `/admin`, and the reader's own
not-found handling (a `null` query result) renders a generic "unavailable"
state for draft/disabled/unknown booklets alike.

---

## 5. React Architecture

### Component hierarchy (conceptual)

```
App (router + providers)
├── Admin
│   ├── AdminPageShell + AdminPageHeader   (shared chrome for every admin page)
│   ├── DashboardPage / BookletListPage / FontManagerPage / MediaLibraryPicker
│   └── BookletEditorPage                  (owns clipboards + page-op shortcuts)
│       ├── PagesSidebar                   (page list, add/dup/copy/cut/paste)
│       └── PageElementEditor  key={pageId}(reducer + selection + shortcuts)
│           ├── EditorCanvas
│           │   ├── PageCanvas   ◄── SHARED renderer
│           │   └── EditorOverlay (+ TextEditOverlay)  ◄── selection/drag/resize
│           └── ElementInspector
└── Reader
    └── ReaderBookletPage
        ├── PageFlip → PageCanvas   ◄── same SHARED renderer
        ├── BookCover / BookBackCover
        ├── VocabularyPanel / CreditsPanel / SpeechRateControl
        └── QuizEmbed
```

### Pages, layouts, shared components

- **Pages** live in `admin/` (route targets) and one in `reader/`.
- **Layout** is composition-based: `src/admin/shell/` provides `AdminPageShell`
  (backdrop + centered content) and `AdminPageHeader`, so each admin page is
  ~15 lines instead of 250 of copy-paste. *Why:* a single edit changes chrome
  everywhere.
- **Shared neutral components** live in `src/components/` (`Spinner`,
  `StatusBadge`, `CreditsPanel`, and generated `ui/` shadcn primitives) —
  anything used by both admin and reader.

### The editor / overlay pattern (key architectural choice)

`EditorCanvas` renders the shared `PageCanvas` **plus a sibling
`EditorOverlay`** in the same canvas-space coordinates, using the *same*
`useCanvasScale` instance. Selection boxes, drag, and resize handles therefore
align with rendered elements **by construction** — there is no duplicated layout
math to keep in sync. Text selection geometry is *measured* from the actually
rendered glyphs (`useTextMeasurements.ts`, a DOM `Range`), not assumed from
stored `w`/`h`, so the selection hugs wrapped/font-loaded text exactly.

### Custom hooks

- **Data hooks** (`src/hooks/*`) — React Query wrappers (see §6/§8).
- **Editor hooks** — `useEditorReducer`, `useAutosave`, `useTextMeasurements`,
  and the two clipboards (`useElementClipboard`, `usePageClipboard`).
- **Renderer hooks** — `useCanvasScale` (shared).
- **Reader hooks** — `useReaderKeyboard`, `useCoverImageReady`,
  `useNextPagePreloader`, `usePageFlipSound`, plus `useViewportWidth`.

### Contexts, reducers, providers

- **Contexts:** `AuthContext` (session/admin), `WordSpeechProvider` (TTS state
  scoped to the reader), `TooltipProvider` (shadcn).
- **Reducer:** exactly one — the editor element tree. *Why a reducer here and
  nowhere else:* it needs an explicit, centralized dispatch point for undo/redo
  snapshots.
- **Providers stack** (from `main.tsx` → `App.tsx`): `QueryClientProvider` →
  `BrowserRouter` → `TooltipProvider` → `AuthProvider`.

*Why plain React (no global store):* the app has exactly one piece of complex
local state (the editor tree) and one piece of small global state (auth). A
reducer + a context cover both; a Redux/Zustand store would be ceremony without
payoff.

---

## 6. State Management

The project splits state into four clearly separated kinds. This separation is
itself the design.

### Server state — React Query

- **What:** booklets, pages, fonts, media, and a page's initial elements.
- **How:** every read/write is a `useQuery`/`useMutation` in `src/hooks/*`, keyed
  (e.g. `['admin-booklet', id]`, `['booklet', token]`). Mutations invalidate
  the relevant keys `onSuccess`.
- **Why React Query:** it removes hand-rolled loading/error/caching boilerplate
  and gives a single caching source of truth. It is the *one* external state
  addition, and `CLAUDE.md` justifies it precisely on that basis.
- **Trade-off:** the reader fetches on load only (no realtime subscription), so
  an already-open reader tab won't reflect a mid-session admin edit — an
  accepted V1 simplification.

### Local component state — `useState`

- **What:** ephemeral UI — hover, dialog open/close, selection ids, cover
  animation stages, mobile detection.
- **Why:** these never need to be shared or persisted. Notably, **selection and
  text-editing ids are kept in `useState`, not the editor reducer**, so they
  never pollute undo history.

### Editor state — `useReducer` + snapshot stack

- **What:** the array of `PageElement`s for the open page, plus `past`/`future`
  undo stacks and a `loaded` flag.
- **Why a reducer:** undo/redo needs a single, auditable transition point. Every
  mutating action pushes the previous array onto `past` (capped by
  `UNDO_HISTORY_LIMIT`) and clears `future`.
- **Why not persisted history / CRDT:** single admin, no realtime collaboration
  requirement — an in-memory, per-session stack is sufficient and simplest.
- **Trade-off:** undo/redo is per-page and per-session; page-structural
  operations (add/delete/duplicate page) are *not* undoable — recovery is via
  the page clipboard's "Paste Page."

### Authentication state — Context

- **What:** `{ session, user, isAdmin, loading }`.
- **How:** `AuthProvider` seeds from `supabase.auth.getSession()` and subscribes
  to `onAuthStateChange`; `isAdmin` is a follow-up `admin_users` lookup.
- **Why a context:** auth is read in many places (router guard, mutations) but
  is small and rarely changes — the textbook case for context over a store.

### Why not Redux / Zustand?

Because there is no *shared, complex, cross-cutting* mutable state that outlives
a single screen. Server state is owned by React Query; editor state is local to
a mounted page; auth is a tiny context. Adding a global store would centralize
state that is deliberately kept local, working against the "no premature
abstraction" rule.

---

## 7. Data Flow

### Login

```
LoginPage → supabase.auth.signInWithPassword()
          → onAuthStateChange fires → AuthProvider sets session
          → checkIsAdmin() queries admin_users (row present? → isAdmin)
          → RequireAuth sees a session → renders AdminRoutes
```

### Loading a booklet in the reader

```
/b/:token → useBookletByToken(token)
          → ONE nested Supabase select: booklet → pages → page_elements
          → RLS filters at every table: anon sees rows only if status='published'
          → unknown/draft/disabled token all resolve to null (same not-found)
          → ReaderBookletPage splits cover / spreads / back cover and renders
```

The single nested select is important: one round trip returns the whole booklet,
and because RLS is enforced independently per table, there is no way to leak an
unpublished booklet's contents.

### Editing (in-memory)

```
User drags/types → EditorOverlay / inspector → dispatch(UPDATE_*) 
                 → reducer produces new elements[] + pushes undo snapshot
                 → PageCanvas re-renders instantly (optimistic, local)
```

### Saving (autosave)

```
elements[] change → useAutosave schedules a debounced timer (~1500ms)
                  → performSave() calls RPC save_page_elements(page_id, elements)
                  → RPC (transactional): delete all rows for page, re-insert array
                  → status: saving → saved | error
Safety nets: flush on unmount (page switch / navigate away) + awaitable flushIfDirty
```

*Why delete-then-reinsert in one transaction:* it makes the stored rows an exact
mirror of the in-memory array in a single atomic step — no per-element diffing,
and a save can never half-write.

### Uploading media

```
File → compressImage() (client-side: downscale to canvas width, re-encode WebP)
     → storage.upload(media/<uuid>.webp)
     → insert media_assets row  ── if this fails → remove the uploaded file (rollback)
     → invalidate ['media-assets'] → library refreshes
```

Storage and the DB are not transactional together, so the code manually rolls
back the orphaned file if the row insert fails.

### Fetching resources (fonts)

Fonts are converted offline (`convert-fonts.mjs`), uploaded to the `fonts`
bucket, and registered in the `fonts` table. The app loads a registered
`@font-face` on demand (`useFontFace`) using the *same* source in editor and
reader — guaranteeing identical text rendering.

### Structural page operations

Add / delete / reorder / duplicate / paste-page go through **RPCs**
(`add_page`, `delete_page`, `reorder_pages`, `duplicate_page`,
`insert_page_with_elements`, cover/back-cover variants). *Why RPCs and not
client updates:* they renumber `page_order` across many rows and re-enforce
invariants ("only the last page may be the quiz page", "≤1 cover") atomically,
which client-side multi-row updates cannot do safely.

---

## 8. Backend Architecture

There is no application server. "The backend" is Supabase + SQL.

### Supabase integration

The frontend uses a single `@supabase/supabase-js` client
(`src/lib/supabaseClient.ts`) for three capabilities: the Postgres REST API
(via PostgREST), Auth, and Storage. All are reached through the React Query
hooks in `src/hooks/*` (plus `useAutosave` and `AuthContext`).

### Authentication

- Email/password via Supabase Auth.
- **Admin status is membership in `admin_users`**, checked by the `is_admin()`
  SQL function — *never a hardcoded UID*. Adding a second admin is a single row
  insert, no code change.
- The first admin row is inserted manually in the SQL editor (running as
  `postgres`, which bypasses RLS), since no admin exists yet to satisfy
  `is_admin()`.

### Database access & the security model

RLS is enabled on **every** table. The pattern:

- **Public tables** (`fonts`, `media_assets`): `select` open to all; writes
  `is_admin()`.
- **Content tables** (`booklets`, `pages`, `page_elements`): anonymous `select`
  only when the (parent) booklet's `status = 'published'`; admins see all;
  writes `is_admin()`.
- Every migration that adds a table must also `GRANT` base privileges to
  `anon`/`authenticated` — RLS only *filters* rows; Postgres still requires the
  grant to touch the table at all. This is an easily-missed gotcha the codebase
  documents explicitly.

### RPC functions (the transactional layer)

`security definer` functions run as their owner, so they bypass row-by-row RLS
but self-check `is_admin()` first. They exist for operations that need
atomicity or invariants:

- `save_page_elements(page_id, elements)` — transactional replace of a page's
  elements.
- `delete_media_asset(id)` — refuses if any element still references the asset
  (there is deliberately **no** delete RLS policy, so this guard can't be
  bypassed).
- Page-structural RPCs (migrations 0002–0008) — renumber order and maintain
  quiz/cover invariants.

### Storage

Two public-read, admin-write buckets: `fonts` and `media`. Public read is
intentional — nothing sensitive lives there, and the real privacy boundary
(draft vs. published) is enforced at the DB layer, not the file layer.

### How the frontend "talks to" the backend

```
Component → React Query hook → supabase-js → (PostgREST | Auth | Storage | RPC)
                                            → Postgres RLS / security-definer fn
```

Every network concern is funneled through hooks; components almost never touch
`supabase` directly.

---

## 9. Design Decisions

### D1 — Shared renderer, never forked

- **Why:** WYSIWYG must be exact between editor and reader.
- **Benefit:** alignment is guaranteed by construction; a rendering change is
  made once.
- **Trade-off:** `PageCanvas` must stay pure and free of mode-specific UI; the
  editor layers behavior *around* it (overlay) rather than *inside* it.
- **Alternative rejected:** separate editor/reader renderers — inevitably drift.

### D2 — Fixed 1920×1080 virtual canvas, scaled

- **Why:** storing geometry as canvas-space pixels makes drag/resize math
  trivial and rendering deterministic.
- **Benefit:** one scaling code path (`useCanvasScale`) → identical output
  everywhere.
- **Trade-off:** fixed aspect ratio; V1 has no UI to change canvas dimensions
  (though they are stored per-booklet for future-proofing).

### D3 — Structured content (polymorphic `page_elements`)

- **Why:** a new element type should be an app-layer addition, not a schema
  change.
- **Benefit:** `type` + `props` JSONB → add a TS variant + a registry entry,
  zero migrations. Shape is validated in the app (TS unions + zod), not by DB
  constraints.
- **Trade-off:** the DB won't enforce `props` shape; correctness relies on the
  app boundary.
- **Alternative rejected:** per-type tables — every new type would need a
  migration and a join.

### D4 — No draft/live content fork

- **Why:** avoid a whole shadow-content + publish-step subsystem.
- **Benefit:** editing a published booklet edits it live; `status` is the only
  visibility gate.
- **Trade-off:** someone loading the link during a save may see a transient
  state. Mitigation: flip to `draft`, edit, republish. `CLAUDE.md` forbids
  building a fork without an explicit decision.

### D5 — Backend = Supabase + RLS (no server)

- **Benefit:** no server to run, secure, or scale; the DB enforces access.
- **Trade-off:** logic that needs a trusted server (e.g. transactions,
  guards) must be expressed as SQL RPCs; you accept Supabase as a dependency.

### D6 — Vercel over Cloudflare Pages

- **Why:** needed a serverless function + native cron (`keep-alive.ts`) to ping
  Supabase every 6h so the free project doesn't pause.
- **Trade-off (documented):** Vercel Hobby's 100GB/mo bandwidth cap now applies
  to anonymous reader traffic — the first likely scaling limit.

### D7 — Sandboxed quiz embed without `allow-same-origin`

- **Why:** the quiz is arbitrary third-party JS (Fillout). It runs inside an
  `iframe srcdoc` with `allow-scripts allow-popups
  allow-popups-to-escape-sandbox allow-forms` — but **omits
  `allow-same-origin`**, so the script cannot read cookies/localStorage or reach
  the app's Supabase session. That omission *is* the security boundary.

---

## 10. Dependency Overview

### Module dependency direction

```
        types/ ◄──────────────── everything (pure contracts, depends on nothing)
        config/ ◄─────────────── components/hooks (constants, no app deps)
          ▲
          │
  renderer/  ── depends only on types/ + config/  (NO admin, NO reader, NO Tailwind)
     ▲   ▲
     │   └────────────── reader/  ── imports renderer/ unmodified + hooks/
     └── admin/editor/ ── imports renderer/ + hooks/ + editor state
                          │
        hooks/ ───────────┴──── depends on lib/supabaseClient + types/ + config/
        lib/  ─────────────────  supabase client, query client, compression
        auth/ ─────────────────  depends on lib/ (supabase)
```

### Architectural boundaries (the rules that must hold)

1. **`renderer/` depends on nothing app-specific** — only `types/` and
   `config/`. It never imports from `admin/` or `reader/`, and never uses
   Tailwind. This is what makes it safely shareable.
2. **`admin/` and `reader/` may import `renderer/`, but never each other.**
3. **Components never call Supabase directly** — they go through `hooks/`
   (exceptions: `useAutosave`, `AuthContext`, which are themselves the data
   layer for their concern).
4. **No component holds magic numbers** — they come from `config/`.
5. **CSS isolation:** admin chrome under `#admin-root`, reader under
   `#reader-root`, each with its own scoped reset; Tailwind's Preflight is not
   imported at all, so no global reset can ever reach `renderer/`.

---

## 11. Development Workflow

Where new things go — follow these and the architecture stays intact.

| You're adding… | Put it in… | Notes |
| --- | --- | --- |
| A new element type (e.g. audio) | `types/elements.ts` variant + `renderer/elements/<X>Element.tsx` + register in `registry.tsx` | **Zero DB migrations** — this is the payoff of D3. Add editor controls in `ElementInspector` + a create path in `PageElementEditor`. |
| A new admin page | `admin/<Page>.tsx` + a `<Route>` in `admin/routes.tsx` | Compose `AdminPageShell` + `AdminPageHeader`. |
| A reader feature | `src/reader/` | Plain Tailwind under `#reader-root`; import `renderer/` unmodified. |
| A data read/write | a hook in `src/hooks/` | `useQuery`/`useMutation`; invalidate keys on success. Never call `supabase` from a component. |
| A tunable value | `src/config/<area>.ts` | Never inline it in a component. |
| A cross-cutting shared UI piece | `src/components/` | Only if both admin *and* reader use it. |
| Shared cross-cutting state | a Context | Reach for a store only if genuinely global + complex (currently nothing qualifies). |
| A multi-row / invariant-bearing DB op | a new SQL RPC migration | Follow the deferrable-constraint + re-enforce-invariant pattern in 0002/0003. |

**General process** (`CLAUDE.md`): one milestone at a time → small focused
commits → stop and report with manual verification steps → wait for go-ahead.
Work on `main`; branch only for structurally risky milestones or schema
migrations. Keep `CLAUDE.md` updated in the same commit that introduces a new
convention.

**Golden rule:** if a change *seems* to need a second rendering path for editor
vs. reader — stop. It almost certainly belongs in `PageCanvas`/the registry, not
a fork.

---

## 12. Mental Model

To hold this system in your head, remember four sentences:

1. **"There is one canvas."** The editor and the reader are two chromes wrapped
   around the *same* `PageCanvas`. Everything visual reduces to: an array of
   typed elements, positioned in 1920×1080 space, scaled to fit. The editor adds
   an overlay for interaction; the reader adds a flip-book for presentation.

2. **"Content is data, not markup."** A page is a list of
   `{ type, x, y, w, h, props }` rows. Rendering is a dispatch table. Adding
   capability means adding a variant and a renderer — not changing the schema.

3. **"The database is the server."** There is no backend to reason about beyond
   Postgres. Who-can-see-what is RLS; who-can-do-what atomically is a
   `security definer` RPC. `status='published'` is the single visibility switch.

4. **"State is sorted by lifetime, not dumped in one store."** Server data lives
   in React Query, the editing session lives in a reducer with an undo stack,
   throwaway UI lives in `useState`, and the tiny always-on auth fact lives in a
   context. Nothing is more global than it needs to be.

Once these four click, the folder layout, the "no fork" rule, the zero-migration
extensibility, and the anonymous-yet-secure reader all follow naturally.

---

## Architecture Summary

The Digital Booklet Platform is a **single React SPA over a serverless Supabase
backend**, organized around one non-negotiable idea: **a single, pure,
never-forked rendering path** (`PageCanvas`) shared by an authenticated editor
and an anonymous reader, so WYSIWYG is guaranteed by construction rather than by
discipline. All page content is **structured, typed data** (`type` + `props`
JSON dispatched through a registry), making new element types pure app-layer
additions with zero database migrations. All geometry lives in a **fixed
1920×1080 virtual canvas** with exactly one scaling mechanism. **Trust is
enforced entirely in Postgres** via Row-Level Security and transactional
`security definer` RPCs, with `status='published'` as the only visibility gate
and no draft/live content fork. State is deliberately **partitioned by lifetime**
— React Query for server data, a `useReducer` snapshot stack for the editing
session, local `useState` for ephemeral UI, and a small context for auth — so no
global store is needed. The guiding spirit throughout is **simple, direct, and
extensible without ceremony**: config over magic numbers, small
single-responsibility files, composition over duplication, and no premature
abstraction. The result is a system whose complexity lives where it belongs — in
the shared canvas and the SQL security layer — and whose surface area stays small
and predictable everywhere else.
