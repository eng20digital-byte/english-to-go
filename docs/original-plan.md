# Digital Booklet Platform — Plan

## Context

Building a two-sided system: an **Admin App** for creating Hebrew-language digital booklets (background image + freely positioned text boxes per page) and a **Public Reader** that anonymous users open via a unique link, with word-by-word click-to-speak TTS and a quiz embed on the final page. This is a greenfield project — the directory currently has only an empty git repo and a `fonts/` folder with 4 Andika New Basic TTFs. Tech stack is fixed: React + Vite + Supabase, no custom backend. The core constraint driving the whole architecture is **WYSIWYG**: the editor and reader must render pages through the literal same component, using a fixed virtual canvas that scales proportionally to any screen.

## Decisions Locked In (from clarification)

- **Admin auth**: Supabase Auth (email/password). Single admin in V1, but gated via an `admin_users` allow-list table (not a hardcoded UID) so adding admins later is a single INSERT, no migration.
- **Hosting**: One Vite SPA, one repo, one deployment — route-split `/admin/*` (auth-gated) vs `/b/:token` (public). Deployed to **Cloudflare Pages free tier** (uncapped bandwidth matters since the reader is public/anonymous-traffic; Vercel free tier caps at 100GB/mo). Two separate deployments rejected as unnecessary complexity for a free-tier, frontend-only app.
- **Quiz embed**: Fillout.com snippet (script + button/div, opens a popup) — this is an arbitrary third-party HTML/JS snippet, not a plain iframe URL. Rendered inside a **sandboxed iframe via `srcdoc`** (detailed sandbox token reasoning below) so the third-party script is isolated from the app's DOM/session.
- **TTS word splitting**: Auto-split on whitespace at render time from plain-text content (not pre-tokenized in the DB).
- **Public link**: Random unguessable token (e.g. `xK9pQ2vL3m`, nanoid), not an admin-chosen slug — since the reader has no auth, the token itself is the only privacy boundary for a published booklet.

## Known risk (flagged, not a blocker)

Hebrew voice availability/quality in `window.speechSynthesis` varies by browser/OS (solid on desktop Chrome/Edge; inconsistent on iOS Safari and Android depending on installed language packs). No client-side fix exists — set `utterance.lang = 'he-IL'` and handle the "no voice available" case gracefully rather than failing silently.

## Additional confirmed decisions (round 2)

- **Draft/published editing model**: No separate draft/live content fork. `status` alone gates reader visibility — `draft` is fully hidden, `published` is live, and edits after publishing autosave directly against the same data (visible to readers on their next load; no realtime push, so an already-open reader tab won't flicker mid-edit). Admin can temporarily flip back to `draft` during a heavy edit session as a manual "take offline" lever, then republish. A true draft/live fork (shadow `page_elements` + explicit publish-copy step) is explicitly out of scope for V1 — revisit only if it becomes a real problem.
- **Font pipeline must be re-runnable**: `scripts/convert-fonts.mjs` scans `fonts/*.{ttf,otf}` and converts any file lacking a corresponding `.woff2` output (idempotent, skips already-converted files) — not a one-off script hardcoded to the current 4 filenames. New fonts can be dropped in and converted anytime by re-running it.
- **TTS interrupt behavior**: clicking a new word immediately cancels any in-progress utterance (`speechSynthesis.cancel()`) before speaking the new word — no queueing.
- **Canvas orientation**: 1080×1920 portrait confirmed for all V1 booklets. The per-booklet `canvas_width`/`canvas_height` columns remain for future-proofing but there's no UI to change them in V1.

## Working agreements (code quality & process)

These apply across all milestones, not just M0:

- **No magic numbers/hardcoded values in components.** Canvas size, debounce timings, default font size, colors, z-index ranges, iframe sandbox tokens, etc. live in `src/config/` (e.g. `src/config/canvas.ts`, `src/config/editor.ts`), imported where needed — not inlined.
- **Small, single-responsibility files.** Split data-fetching, UI, and business logic rather than mixing them in one component. If a file does more than one clear job, split it.
- **Follow the proposed folder structure consistently.** If a new feature doesn't cleanly fit it, stop and ask before improvising a one-off pattern.
- **Comment the why, not the what** — especially non-obvious decisions (e.g. why `allow-same-origin` is omitted from the quiz iframe sandbox, why `page_elements` uses JSONB over per-type tables, why word-splitting happens at render time, why there's no draft/live content fork).
- **Extensibility everywhere, not just `page_elements`.** Adding a new text style option, media type, or per-booklet setting should not require hunting across unrelated files — hold the same registry/config-driven pattern standard broadly.
- **No premature abstraction.** Simple and direct beats generic frameworks for hypothetical needs not in the brief.
- **Keep `CLAUDE.md` updated in the same commit** whenever a milestone introduces a new convention, config location, or architectural decision — it must never go stale.

### Process: one milestone at a time

For each milestone: build only that milestone's scope → commit (small focused commits along the way are fine, not one giant dump) → stop and report back what was built/changed and **exact manual verification steps** → wait for explicit go-ahead before starting the next milestone. If a bug/change is reported, fix it and ask for re-verification before moving on — don't bundle the fix with the next milestone.

---

## 1. Architecture

### App structure
Single Vite + React + TS SPA, React Router split:
- `/admin/*` — auth-gated via `RequireAuth` (Supabase session + `admin_users` check)
- `/admin/login`
- `/b/:token` — public reader, no auth, published booklets only

### Shared renderer (the core constraint)
`src/renderer/PageCanvas.tsx` is a **pure rendering component** — props in (`page`, `scale`, `renderMode: 'reader' | 'editor'`), JSX out. It iterates `page_elements` by `z_index` and dispatches by `type` via a small registry (`renderer/elements/registry.ts`) to per-type renderers (`TextElement`, `BackgroundImageElement`).

- **Reader** (`reader/ReaderBookletPage.tsx`) renders `PageCanvas` directly.
- **Editor** (`admin/editor/EditorCanvas.tsx`) renders the *same* `PageCanvas` plus a sibling `EditorOverlay` (selection outlines, drag handles, resize handles) positioned in the same canvas-space coordinates via the same scale factor — zero duplicate layout math, pixel-perfect alignment guaranteed by construction.
- `renderMode` only toggles intrinsic rendering behavior (e.g. word-spans are click-active for TTS in `reader` mode only — in `editor` mode the whole text box is the drag/select target, not individual words).

`TextElement` splits `content` on `/\s+/`, wraps each word in a `<span data-word-index>`, preserves spacing via `white-space: pre-wrap`, and respects `dir="auto"` or an explicit `direction` override for mixed Hebrew/English.

### Fixed canvas & scaling
- Canvas is 1080×1920 (stored per-booklet in `canvas_width`/`canvas_height` columns, defaulted, for future-proofing — V1 always uses the default).
- Element positions (`x`, `y`, `w`, `h`, `rotation`) stored as **canvas-space pixel values** (not normalized 0–1) — directly usable as CSS px, simplest for drag/resize math, no per-render conversion.
- Scaling: a fixed-aspect-ratio viewport container + `transform: scale(var(--scale))` on a 1080×1920 inner element. `scale` computed via `ResizeObserver` in a shared `useCanvasScale(containerRef)` hook used identically by editor and reader.

### Structured content model
`page_elements` is one polymorphic table: `type` discriminator + `props jsonb`. Chosen over per-type tables because the brief explicitly requires adding future types (image, audio, button, animation) without schema rewrites — with JSONB, a new type is purely an app-layer addition (new TS type + new renderer component in the registry), zero migrations. Shape validated at the app layer via TypeScript discriminated unions (`src/types/elements.ts`) + zod at the save boundary — deliberately no DB-level JSONB constraints, per the brief's extensibility guidance.

```ts
type PageElement =
  | { id, page_id, type: 'text'; z_index, x, y, w, h, rotation; props: TextProps }
  | { id, page_id, type: 'background_image'; z_index, x, y, w, h, rotation; props: BackgroundImageProps };

interface TextProps {
  content: string;        // plain text, split into words at render time
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

### State management
Plain React — no Redux/Zustand needed at this scope:
- `AuthContext` for the Supabase session.
- `useReducer` for the in-editor element tree (gives a clean dispatch point for undo/redo).
- **React Query** added (small, focused) purely for Supabase data fetching/caching of booklets/pages/fonts/media — removes hand-rolled loading/error boilerplate without imposing architecture.

### Autosave & undo/redo
- **Undo/redo**: in-memory snapshot stack (full element-array snapshots, capped ~50) inside the editor's `useReducer`. Per-session only, not persisted — no CRDT/OT needed (single admin, single session, no realtime collab requirement).
- **Autosave**: debounced (~1500ms) upsert of the current page's elements via a single Postgres RPC (`save_page_elements(page_id, elements jsonb)`) wrapped in a transaction so a save can't half-write. Visible save-status indicator (`idle/saving/saved/error`) + manual "Save now" + save-on-navigate-away safety net.

---

## 2. Supabase Schema

RLS enabled on all tables. Admin check via a reusable function (not a hardcoded UID), so adding a second admin is a single `admin_users` insert:

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

RLS: `is_admin()` only, no public access.

### `fonts`
| column | type | notes |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| name | text not null | e.g. "Andika New Basic" |
| weight | text not null | regular / bold / italic / bolditalic |
| storage_path | text not null | `fonts/<slug>.woff2` |
| created_at | timestamptz default now() | |
| | | unique(name, weight) |

RLS: SELECT public (`true`) — reader needs fonts with no auth. INSERT/UPDATE/DELETE `is_admin()`.

### `media_assets`
| column | type | notes |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| storage_path | text not null | `media/<id>.<ext>` |
| file_name | text not null | original name, for admin UI |
| width / height | int | optional, aspect-ratio hints |
| created_by | uuid references admin_users(id) | |
| created_at | timestamptz default now() | |

RLS: SELECT public (`true`). INSERT/UPDATE `is_admin()`. **No raw DELETE policy** — deletion only via an RPC `delete_media_asset(id)` (security definer, admin-gated inside the function) that raises if any `page_elements` row references it (`props->>'media_asset_id' = id`), guaranteeing the in-use protection can't be bypassed by a direct API call. Index on `storage_path`.

### `booklets`
| column | type | notes |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| public_token | text not null unique | random nanoid, public URL: `/b/:public_token` |
| title | text not null | admin-facing only |
| status | text not null default 'draft' | 'draft' \| 'published' |
| canvas_width | int not null default 1080 | |
| canvas_height | int not null default 1920 | |
| quiz_embed_code | text | raw Fillout snippet, nullable |
| quiz_embed_height | int default 600 | iframe height for inline-style embeds |
| created_by | uuid references admin_users(id) | |
| created_at / updated_at | timestamptz default now() | |

RLS: SELECT — public only where `status = 'published'`; `is_admin()` sees all (draft+published, for the admin list). INSERT/UPDATE/DELETE `is_admin()`. Unique index on `public_token`.

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
| type | text not null | 'text' \| 'background_image' (V1); future types added with no migration |
| z_index | int not null default 0 | |
| x, y, w, h | numeric not null default ... | canvas-space px |
| rotation | numeric not null default 0 | included now to avoid a later migration |
| props | jsonb not null default '{}' | type-specific shape, see §1 |
| created_at / updated_at | timestamptz default now() | |
| | | index on page_id, index on (page_id, z_index) |

RLS: SELECT public if parent page's booklet is published (join through `pages → booklets`); `is_admin()` sees all. Writes `is_admin()` (in practice via the `save_page_elements` RPC).

### Storage buckets
- **`fonts`** — public read, admin-only write. Path: `fonts/<slug>.woff2`.
- **`media`** — public read, admin-only write. Path: `media/<media_asset_id>.<ext>`.

Both public-read is intentional and safe: no sensitive data lives in either bucket, and the real security boundary (draft vs. published) is enforced at the DB/RLS layer for structured content, not at the file layer.

---

## 3. Folder Structure

```
src/
  main.tsx
  App.tsx                       -- router: /admin/*, /admin/login, /b/:token
  lib/
    supabaseClient.ts
    queryClient.ts
  types/
    database.ts                 -- Supabase row types
    elements.ts                 -- PageElement union, TextProps, BackgroundImageProps
  auth/
    AuthContext.tsx
    RequireAuth.tsx
  renderer/                     -- SHARED — imported unmodified by admin and reader
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
  convert-fonts.mjs               -- one-time TTF -> WOFF2 (Node, wawoff2)
fonts/                             -- existing source TTFs (input to the script above)
public/
  _redirects                      -- Cloudflare Pages SPA fallback
supabase/
  migrations/
    0001_init.sql                 -- full schema, RLS, is_admin(), buckets
docs/
  milestones/
    M0..M12 *.md
CLAUDE.md
```

`renderer/` is the one folder both `admin/` and `reader/` import from and never fork.

---

## 4. Milestones

Each milestone = a small, focused, demoable, committable chunk. Files to be created at `/docs/milestones/M<n>-<slug>.md`:

- **M0** — Repo & tooling scaffold (Vite+React+TS, router, Supabase client, React Query, zod, ESLint/Prettier, `.env.example`)
- **M1** — Supabase schema migration (all tables, RLS, `is_admin()`, storage buckets/policies, `save_page_elements` and `delete_media_asset` RPCs), manual admin user creation
- **M2** — App shell: single SPA, both route trees, `AuthContext`/`RequireAuth` working end-to-end, deployed to Cloudflare Pages with `_redirects`
- **M3** — Font pipeline: `convert-fonts.mjs`, convert the 4 Andika TTFs to WOFF2, minimal `FontManagerPage` to upload + register them, verify `@font-face` renders Hebrew correctly
- **M4** — Shared renderer core: `PageCanvas`, `useCanvasScale`, `TextElement` (word-split, RTL), `BackgroundImageElement` — proven against hardcoded mock data first, no DB dependency yet
- **M5** — Reader: fetch published booklet by token, render via `PageCanvas`, `PageNav`; verify RLS blocks drafts for anonymous sessions
- **M6** — Media library: upload + picker + protected delete via `delete_media_asset` RPC
- **M7** — Admin: booklet CRUD (create/list/status toggle) + page CRUD/reorder shell (no element editing yet)
- **M8** — Editor: `EditorCanvas` + `EditorOverlay` (select/drag/resize) + add/delete elements + `useEditorReducer` undo/redo (may split into M8a mechanics / M8b add-delete-undo if it grows large)
- **M9** — Editor: `ElementInspector` (font/size/color/align/line-height) + `useAutosave` with save-status indicator
- **M10** — Word-click TTS: `useWordSpeech` (single-word-utterance-per-click for cross-browser reliability over `onboundary` events), `SpeechRateControl`, wired into `TextElement` reader-mode only
- **M11** — Quiz embed: `QuizEmbedEditor` (paste Fillout snippet), `QuizEmbed` sandboxed iframe (`sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"`, deliberately omitting `allow-same-origin` so the embedded script can run but cannot reach the parent DOM/session/cookies — `srcdoc` itself also gives an opaque origin), `pages.is_quiz_page` wired into the reader's final-page rendering
- **M12** — Polish: mobile/responsive QA, Hebrew typography review, loading/error/404 states for unknown or unpublished tokens

### Sandbox reasoning (for M11, recorded for CLAUDE.md)
- `allow-scripts` — required for Fillout's embed script to execute at all.
- `allow-popups` — required for the popup-style embed's `window.open` to work.
- `allow-popups-to-escape-sandbox` — the spawned popup is Fillout's own trusted page; it should run unsandboxed like a normal new tab, not inherit the parent iframe's restrictions.
- `allow-forms` — covers the inline-embed variant.
- `allow-same-origin` deliberately omitted — combined with `srcdoc`'s opaque origin, this means the embedded script, even though it executes, cannot read cookies/localStorage or reach into the parent page's DOM or the admin/reader app's Supabase session.

---

## 5. First implementation actions

1. Create `/docs/milestones/M0-…md` through `M12-…md` from the breakdown above.
2. Create top-level `CLAUDE.md` documenting: tech stack, the locked-in decisions section above, the full schema, the shared-renderer rule, folder structure, and milestone list — as the permanent reference for future sessions.
3. Commit these planning docs as the first commit.
4. Begin M0.

## Verification approach (ongoing through milestones)

- M2: confirm login/logout and route guarding work in a real browser against the deployed Cloudflare Pages URL.
- M4: render mock Hebrew/English mixed text at several viewport widths, confirm scaling holds proportions and RTL renders correctly.
- M5: confirm an anonymous (logged-out) browser can load a published booklet by token and is blocked from a draft one (RLS check).
- M9: side-by-side editor vs. reader screenshot comparison to confirm true WYSIWYG.
- M10: manual click-test on Hebrew and English words, rate slider, "currently speaking" highlight.
- M11: paste a real Fillout snippet, confirm the popup opens and submits correctly from inside the sandboxed iframe.
