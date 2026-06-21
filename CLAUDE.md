# Digital Booklet Platform

Permanent reference for architecture, schema, conventions, and decisions. Keep this updated in the same commit whenever a milestone introduces a new convention, config location, or architectural decision — it must never go stale.

## What this is

Two-sided system: an **Admin App** for creating Hebrew-language digital booklets (background image + freely positioned, draggable/resizable text boxes per page) and a **Public Reader** opened via a unique unguessable link (no login required), with word-by-word click-to-speak TTS and a quiz embed on the final page.

Full original plan with detailed rationale: [docs/original-plan.md](docs/original-plan.md).

## Tech stack

React + Vite + TypeScript, Supabase (Postgres DB, Auth, Storage) — no custom backend server. Single SPA, single deployment.

## Deployment

**Cloudflare Pages, free tier.** Chosen over Vercel because the public reader serves anonymous/public traffic with unpredictable volume, and Cloudflare Pages' free tier has no bandwidth cap (Vercel's free tier caps at 100GB/mo). `public/_redirects` (`/* /index.html 200`) handles SPA fallback routing.

## Routing

Single app, client-side route split — not two separate deployments:
- `/admin/*` — auth-gated via `RequireAuth` (Supabase session + `admin_users` row check)
- `/admin/login`
- `/b/:token` — public reader, no auth, only `status = 'published'` booklets resolve (RLS-enforced)

## Core architecture rules

### 1. Shared renderer — never fork this

`src/renderer/PageCanvas.tsx` is the **single rendering implementation** used by both the editor and the reader, unmodified. It is a pure component: `{ page, scale, renderMode }` in, JSX out. It dispatches per-element by `type` via `src/renderer/elements/registry.ts`.

- Reader (`src/reader/ReaderBookletPage.tsx`) renders `PageCanvas` directly.
- Editor (`src/admin/editor/EditorCanvas.tsx`) renders the *same* `PageCanvas` plus a sibling `EditorOverlay` (selection/drag/resize handles) positioned in the same canvas-space coordinates via the same `useCanvasScale` instance — no duplicate layout math, alignment is guaranteed by construction, not by careful coding.
- `renderMode: 'reader' | 'editor'` only toggles behavior intrinsic to rendering — e.g. word-spans are click-active for TTS in `reader` mode only; in `editor` mode the whole text box is the drag/select target.

If a future change seems to require a second rendering path for the editor vs. reader, stop — that almost certainly means the change belongs in `PageCanvas`/the registry, not a fork.

### 2. Fixed virtual canvas, scaled to fit

All booklets use a 1080×1920 (portrait) virtual canvas (constants in `src/config/canvas.ts`, also stored per-booklet in `booklets.canvas_width`/`canvas_height` for future-proofing, though V1 has no UI to change them). Element positions (`x`, `y`, `w`, `h`, `rotation`) are stored as **canvas-space pixel values**, not normalized 0–1 — directly usable as CSS px, simplest for drag/resize math.

Scaling mechanism: a fixed-aspect-ratio viewport container + `transform: scale(var(--scale))` on the 1080×1920 inner element. `scale` is computed via `ResizeObserver` in `src/renderer/useCanvasScale.ts`, used identically by editor and reader. This is what guarantees WYSIWYG — there is exactly one scaling code path.

### 3. Structured content, not HTML

`page_elements` is one polymorphic table: `type` discriminator + `props jsonb`. Chosen over per-type tables specifically so a new element type (image, audio, button, animation) is a pure app-layer addition — new TS type in `src/types/elements.ts` + new renderer component registered in `src/renderer/elements/registry.ts` — zero DB migrations. Shape is validated at the app layer (TS discriminated unions + zod at the save boundary), deliberately not via DB-level JSONB constraints.

```ts
type PageElement =
  | { id, page_id, type: 'text'; z_index, x, y, w, h, rotation; props: TextProps }
  | { id, page_id, type: 'background_image'; z_index, x, y, w, h, rotation; props: BackgroundImageProps };

interface TextProps {
  content: string;        // plain text; words are split at render time, not pre-tokenized
  font_id: string;
  font_size: number;      // px, canvas-space (1080-wide reference)
  color: string;
  align: 'left' | 'right' | 'center';
  line_height: number;
  direction: 'rtl' | 'ltr' | 'auto';
}
interface BackgroundImageProps {
  media_asset_id: string;
  fit: 'cover' | 'contain';
}
```

### 4. No draft/live content fork

`booklets.status` (`draft` | `published`) is the *only* visibility gate. There is no separate staging copy of content — editing a published booklet edits it live, autosaving directly. This is a deliberate V1 simplification: the reader has no realtime subscription (fetches on page load only), so an already-open reader tab won't flicker mid-edit; only someone loading the link at the exact moment of a save sees a transient state, an accepted edge case. If heavier in-progress editing needs to happen without any visibility risk, the admin can temporarily flip the booklet back to `draft`, edit, then republish. **Do not build a draft/live fork (shadow content table + explicit publish step) without an explicit decision to revisit this** — it's a meaningful complexity jump that was deliberately deferred.

## Auth & multi-admin

Supabase Auth (email/password). Admin status is determined by membership in `admin_users` (a row referencing `auth.users.id`), checked via the `is_admin()` SQL function — **never hardcode a UID** in RLS policies or app logic. Adding a second admin later is a single `admin_users` INSERT, no migration, no code change.

## Public link

`booklets.public_token` is a randomly generated unguessable string (nanoid), not an admin-chosen slug. Since the reader has zero auth, the token is the only privacy boundary for a published booklet — don't make it guessable or sequential.

## TTS (word-click)

Browser `window.speechSynthesis` only — no external TTS service, per the brief. Word boundaries are determined by splitting `content` on whitespace **at render time** (not pre-tokenized in the DB) — both editor and reader use the same split logic in `TextElement`, but only the reader wires clicks to speech (editor mode keeps the text box itself as the drag/select target). Clicking a new word immediately cancels (`speechSynthesis.cancel()`) any in-progress utterance before speaking the new one — no queueing. `utterance.lang` set per content language (`he-IL` for Hebrew).

**Known external risk**: Hebrew voice availability/quality varies by browser/OS (solid on desktop Chrome/Edge; inconsistent on iOS Safari and Android depending on installed language packs). No client-side fix exists — handle "no voice available" gracefully rather than failing silently.

## Quiz embed (final page)

`booklets.quiz_embed_code` stores a raw Fillout.com embed snippet (script + button/div that opens a popup) — an arbitrary third-party HTML/JS snippet, not a plain iframe URL. Rendered via `src/quiz/QuizEmbed.tsx` inside a sandboxed `<iframe srcdoc="...">`:

```
sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
```

- `allow-scripts` — required for Fillout's embed script to execute at all.
- `allow-popups` — required for the popup-style embed's `window.open` to work.
- `allow-popups-to-escape-sandbox` — the spawned popup is Fillout's own trusted page; it runs unsandboxed like a normal new tab rather than inheriting the parent iframe's restrictions.
- `allow-forms` — covers the inline-embed variant (a `<div>` rendering a form directly in the iframe).
- **`allow-same-origin` is deliberately omitted.** Combined with `srcdoc`'s inherently opaque (`null`) origin, this means the embedded script — even though it executes — cannot read cookies/localStorage or reach into the parent page's DOM, including the admin/reader app's Supabase session. This is the actual security boundary; don't add `allow-same-origin` without a real reason and a re-review of this reasoning.

A page is marked as the quiz page via `pages.is_quiz_page`; the reader renders `QuizEmbed` instead of `PageCanvas` for that page.

## Media library

Images uploaded to the `media` Storage bucket are shared across all booklets via `media_assets`. Deletion is only possible through the `delete_media_asset(id)` RPC (security definer, admin-gated, raises if any `page_elements.props->>'media_asset_id'` references it) — there is no raw DELETE RLS policy on `media_assets`, so this protection can't be bypassed by a direct API call.

## Font pipeline

`scripts/convert-fonts.mjs` converts `fonts/*.{ttf,otf}` to WOFF2, skipping files that already have an up-to-date `.woff2` output (idempotent — designed to be re-run any time new font files are added, not a one-off script). Converted fonts are uploaded to the `fonts` Storage bucket and registered in the `fonts` table (`name`, `weight`, `storage_path`), then selectable per text box by `font_id`. Same `@font-face` source is used in editor and reader, guaranteeing identical rendering.

## State management

Plain React, no Redux/Zustand:
- `AuthContext` for the Supabase session.
- `useReducer` for the in-editor element tree (clean dispatch point for undo/redo).
- React Query for all Supabase data fetching/caching (booklets, pages, fonts, media) — the one external addition, justified purely by removing hand-rolled loading/error boilerplate.

## Autosave & undo/redo

- **Undo/redo**: in-memory snapshot stack of the element array (capped size, constant in `src/config/editor.ts`), per editing session only — not persisted, no CRDT/OT (single admin, no realtime collaboration requirement).
- **Autosave**: debounced (constant in `src/config/editor.ts`, default ~1500ms) save via the `save_page_elements(page_id, elements)` RPC, wrapped in a transaction so a save can't half-write. UI shows `idle/saving/saved/error`; manual "Save now" + save-on-navigate-away as a safety net.

## Code-quality bar (applies to every milestone)

- **No magic numbers/hardcoded values in components.** Canvas size, debounce timings, default font size/colors, z-index ranges, sandbox tokens, etc. live in `src/config/`, not inline.
- **Small, single-responsibility files.** Split data-fetching, UI, and business logic rather than mixing concerns in one component.
- **Follow the folder structure below consistently.** If a new feature doesn't cleanly fit, stop and ask before improvising a one-off pattern.
- **Comment the why, not the what** — especially non-obvious decisions (e.g. the sandbox token reasoning above, why JSONB over per-type tables, why word-splitting happens at render time, why there's no draft/live fork).
- **Extensibility everywhere** — adding a new text style option, media type, or per-booklet setting should not require hunting across unrelated files. Hold the registry/config-driven pattern as the general standard, not just for `page_elements`.
- **No premature abstraction** — simple and direct beats a generic framework for hypothetical needs not in the brief.

## Working process

One milestone at a time (see `docs/milestones/`). Build only that milestone's scope → commit with a clear message (small focused commits along the way, not one giant dump) → stop and report what was built/changed plus exact manual verification steps → wait for explicit go-ahead before starting the next milestone. Bug reports get fixed and re-verified before moving on, not bundled into the next milestone.

## Folder structure

```
src/
  main.tsx
  App.tsx                       -- router: /admin/*, /admin/login, /b/:token
  config/                       -- canvas size, debounce timings, defaults, sandbox tokens, etc.
  lib/
    supabaseClient.ts
    queryClient.ts
  types/
    database.ts                 -- Supabase row types
    elements.ts                 -- PageElement union, TextProps, BackgroundImageProps
  auth/
    AuthContext.tsx
    RequireAuth.tsx
  renderer/                     -- SHARED — imported unmodified by admin and reader, never forked
    PageCanvas.tsx
    useCanvasScale.ts
    elements/
      TextElement.tsx
      BackgroundImageElement.tsx
      registry.ts
  tts/
    useWordSpeech.ts
    SpeechRateControl.tsx
  quiz/
    QuizEmbed.tsx                -- sandboxed iframe srcdoc renderer
  admin/
    routes.tsx
    BookletListPage.tsx
    BookletEditorPage.tsx
    editor/
      EditorCanvas.tsx
      EditorOverlay.tsx
      ElementInspector.tsx
      useEditorReducer.ts        -- element tree + undo/redo
      useAutosave.ts
      MediaLibraryPicker.tsx
      QuizEmbedEditor.tsx
    fonts/
      FontManagerPage.tsx
  reader/
    routes.tsx
    ReaderBookletPage.tsx
    PageNav.tsx
  components/                    -- generic shared UI
  hooks/
    useBookletQuery.ts            -- React Query hooks
scripts/
  convert-fonts.mjs               -- re-runnable TTF/OTF -> WOFF2
fonts/                             -- source TTF/OTF files (input to the script above)
public/
  _redirects                      -- Cloudflare Pages SPA fallback
supabase/
  migrations/
    0001_init.sql
docs/
  milestones/                      -- M0..M12, one file per milestone
CLAUDE.md
```

## Supabase Schema

RLS enabled on every table. Admin check via a reusable function, never a hardcoded UID:

```sql
create function is_admin() returns boolean as $$
  select exists (select 1 from admin_users where id = auth.uid())
$$ language sql security definer stable;
```

### `admin_users`
| column | type | notes |
|---|---|---|
| id | uuid PK | references `auth.users(id)` |
| email | text not null | |
| created_at | timestamptz default now() | |

RLS: `is_admin()` only.

### `fonts`
| column | type | notes |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| name | text not null | e.g. "Andika New Basic" |
| weight | text not null | regular / bold / italic / bolditalic |
| storage_path | text not null | `fonts/<slug>.woff2` |
| created_at | timestamptz default now() | |
| | | unique(name, weight) |

RLS: SELECT public (`true`). INSERT/UPDATE/DELETE `is_admin()`.

### `media_assets`
| column | type | notes |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| storage_path | text not null | `media/<id>.<ext>` |
| file_name | text not null | original name, admin UI display |
| width / height | int | optional aspect-ratio hints |
| created_by | uuid references admin_users(id) | |
| created_at | timestamptz default now() | |

RLS: SELECT public (`true`). INSERT/UPDATE `is_admin()`. **No DELETE policy** — deletion only via `delete_media_asset(id)` RPC (security definer, admin-gated, raises if referenced). Index on `storage_path`.

### `booklets`
| column | type | notes |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| public_token | text not null unique | random nanoid, public URL `/b/:public_token` |
| title | text not null | admin-facing only |
| status | text not null default 'draft' | 'draft' \| 'published' |
| canvas_width | int not null default 1080 | |
| canvas_height | int not null default 1920 | |
| quiz_embed_code | text | raw Fillout snippet, nullable |
| quiz_embed_height | int default 600 | iframe height for inline-style embeds |
| created_by | uuid references admin_users(id) | |
| created_at / updated_at | timestamptz default now() | |

RLS: SELECT public only where `status = 'published'`; `is_admin()` sees all. Writes `is_admin()`.

### `pages`
| column | type | notes |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| booklet_id | uuid not null references booklets(id) on delete cascade | |
| page_order | int not null | 0-based sequence |
| is_quiz_page | boolean not null default false | flags the final page to render `quiz_embed_code` instead of elements |
| created_at | timestamptz default now() | |
| | | unique(booklet_id, page_order), index on booklet_id |

RLS: SELECT public if parent booklet is published; `is_admin()` sees all. Writes `is_admin()`.

### `page_elements`
| column | type | notes |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| page_id | uuid not null references pages(id) on delete cascade | |
| type | text not null | 'text' \| 'background_image' (V1); future types added with zero migrations |
| z_index | int not null default 0 | |
| x, y, w, h | numeric not null | canvas-space px |
| rotation | numeric not null default 0 | included now to avoid a later migration |
| props | jsonb not null default '{}' | type-specific shape, see §3 above |
| created_at / updated_at | timestamptz default now() | |
| | | index on page_id, index on (page_id, z_index) |

RLS: SELECT public if parent page's booklet is published (join `pages → booklets`); `is_admin()` sees all. Writes `is_admin()` (via `save_page_elements` RPC in practice).

### Storage buckets

- **`fonts`** — public read, admin-only write. Path: `fonts/<slug>.woff2`.
- **`media`** — public read, admin-only write. Path: `media/<media_asset_id>.<ext>`.

Both public-read is intentional: no sensitive data lives in either bucket, and the real security boundary (draft vs. published) is enforced at the DB/RLS layer for structured content, not at the file layer.

## Milestones

See `docs/milestones/` for full per-milestone scope and verification steps.

- M0 — Repo & tooling scaffold
- M1 — Supabase schema migration
- M2 — App shell & deployment
- M3 — Font pipeline
- M4 — Shared renderer core
- M5 — Public reader (read-only)
- M6 — Media library
- M7 — Admin: booklet & page CRUD
- M8 — Editor: canvas, selection, drag/resize, undo/redo
- M9 — Editor: style controls & autosave
- M10 — Word-click TTS
- M11 — Quiz embed (final page)
- M12 — Polish & UX

## UI component library — scope boundary

Admin interface (forms, lists, dialogs, navigation — everything outside
the canvas) uses **shadcn/ui** + Tailwind CSS.

**Hard boundary: `src/renderer/` (PageCanvas and all element renderers)
NEVER uses Tailwind classes or relies on Tailwind's global reset/preflight.**
This is the WYSIWYG-critical code — it must render identically regardless
of what CSS framework styles the surrounding admin chrome. Tailwind's
preflight must be scoped/disabled so it cannot affect canvas-internal
elements (e.g. via `important: '#admin-root'` scoping, or disabling
preflight and hand-rolling the minimal reset `renderer/` needs).

If you're ever unsure whether a new piece of UI belongs to "admin chrome"
(→ shadcn/Tailwind OK) or "the canvas" (→ isolated, no Tailwind) — stop
and ask.