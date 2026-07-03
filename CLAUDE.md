# Digital Booklet Platform

Permanent reference for architecture, schema, conventions, and decisions. Keep this updated in the same commit whenever a milestone introduces a new convention, config location, or architectural decision — it must never go stale.

## What this is

Two-sided system: an **Admin App** for creating Hebrew-language digital booklets (background image + freely positioned, draggable/resizable text boxes per page) and a **Public Reader** opened via a unique unguessable link (no login required), with word-by-word click-to-speak TTS and a quiz embed on the final page.

Full original plan with detailed rationale: [docs/original-plan.md](docs/original-plan.md).

## Tech stack

React + Vite + TypeScript, Supabase (Postgres DB, Auth, Storage) — no custom backend server. Single SPA, single deployment.

## Deployment

**Vercel, free (Hobby) tier.** Originally planned for Cloudflare Pages (no bandwidth cap on its free tier, vs. Vercel Hobby's 100GB/mo), but the decision was changed to Vercel — needed for `api/keep-alive.ts`, a Vercel serverless function + native Cron Job (`vercel.json`) that pings Supabase every 6h so the free-tier Supabase project doesn't pause after 7 days of inactivity. SPA fallback routing is handled by the `rewrites` rule in `vercel.json`, not `public/_redirects` (that file is a leftover from the Cloudflare Pages plan and is no longer read by the live deployment).

**Known consequence of this switch**: Vercel Hobby's 100GB/mo bandwidth cap now applies to the public reader's anonymous traffic (previously avoided by choosing Cloudflare). If reader traffic grows, this cap — not Supabase — may become the first thing to hit.

## Routing

Single app, client-side route split — not two separate deployments:

- `/admin/*` — auth-gated via `RequireAuth` (Supabase session + `admin_users` row check)
- `/admin/login`
- `/b/:token` — public reader, no auth, only `status = 'published'` booklets resolve (RLS-enforced); `draft` and `disabled` both resolve to the same not-found behavior

## Core architecture rules

### 1. Shared renderer — never fork this

`src/renderer/PageCanvas.tsx` is the **single rendering implementation** used by both the editor and the reader, unmodified. It is a pure component: `{ page, scale, renderMode }` in, JSX out. It dispatches per-element by `type` via `src/renderer/elements/registry.ts`.

- Reader (`src/reader/ReaderBookletPage.tsx`) renders `PageCanvas` directly.
- Editor (`src/admin/editor/EditorCanvas.tsx`) renders the _same_ `PageCanvas` plus a sibling `EditorOverlay` (selection/drag/resize handles) positioned in the same canvas-space coordinates via the same `useCanvasScale` instance — no duplicate layout math, alignment is guaranteed by construction, not by careful coding.
- `renderMode: 'reader' | 'editor'` only toggles behavior intrinsic to rendering — e.g. word-spans are click-active for TTS in `reader` mode only; in `editor` mode the text box is the drag/select target.

PageCanvas tags every element wrapper with `data-element-id`/`data-element-type` — inert, mode-agnostic markers (no effect on rendering, so it's still a pure component and still never forked) that let the editor overlay locate rendered nodes.

**Text selection geometry is measured, not assumed.** A text element's stored `w`/`h` is only its wrapping width plus a now-unused height — its selection box (border, hit-area, resize handles, action bubble) is sized to the _actually rendered_ glyph bounds via `src/admin/editor/useTextMeasurements.ts` (a DOM `Range` over the rendered text node), so it hugs the text and reflects font/size/weight/line-breaks/line-height/alignment/wrapping exactly, updating whenever any of those change. Consequences: a text box auto-fits its height to the rendered lines and exposes **two side handles** (left/right = wrapping width) instead of corner handles; resizing still writes the stored frame `w`/`x` (height stays content-driven, so stored `h` is vestigial for text). Non-text elements (image, vocabulary) keep stored-frame geometry and corner handles unchanged. Measurement re-runs for a few animation frames until it stabilizes, specifically to catch async web-font loads that change metrics after first paint.

The inline-edit textarea (`TextEditOverlay`) follows the same principle: it overlays the rendered text faithfully — real `@font-face` family (not the admin chrome font), `font_size × scale`, matching line-height/align/direction, **zero padding**, and a `box-shadow` frame (not a `border`, which would shift the text off the rendered glyphs) — and auto-grows its height to the content (the stored `h` is ignored). It wraps at the element's `w` so its line breaks, and therefore the caret, match the canvas exactly. Focus + caret-to-end runs **once on mount**, never per-keystroke: keying that effect on content length is what previously forced the caret to the end after every character (append-only editing); leaving the textarea to manage its own caret/selection restores normal click-to-place / select / mid-text editing.

If a future change seems to require a second rendering path for the editor vs. reader, stop — that almost certainly means the change belongs in `PageCanvas`/the registry, not a fork.

### 2. Fixed virtual canvas, scaled to fit

All booklets use a 1920×1080 (landscape, 16:9) virtual canvas (constants in `src/config/canvas.ts`, also stored per-booklet in `booklets.canvas_width`/`canvas_height` for future-proofing, though V1 has no UI to change them). Element positions (`x`, `y`, `w`, `h`, `rotation`) are stored as **canvas-space pixel values**, not normalized 0–1 — directly usable as CSS px, simplest for drag/resize math.

Scaling mechanism: a fixed-aspect-ratio viewport container + `transform: scale(var(--scale))` on the 1920×1080 inner element. `scale` is computed via `ResizeObserver` in `src/renderer/useCanvasScale.ts`, used identically by editor and reader. This is what guarantees WYSIWYG — there is exactly one scaling code path.

### 3. Structured content, not HTML

`page_elements` is one polymorphic table: `type` discriminator + `props jsonb`. Chosen over per-type tables specifically so a new element type (image, audio, button, animation) is a pure app-layer addition — new TS type in `src/types/elements.ts` + new renderer component registered in `src/renderer/elements/registry.ts` — zero DB migrations. Shape is validated at the app layer (TS discriminated unions + zod at the save boundary), deliberately not via DB-level JSONB constraints.

```ts
type PageElement =
  | { id; page_id; type: 'text'; z_index; x; y; w; h; rotation; props: TextProps }
  | {
      id;
      page_id;
      type: 'background_image';
      z_index;
      x;
      y;
      w;
      h;
      rotation;
      props: BackgroundImageProps;
    };

interface TextProps {
  content: string; // plain text; words are split at render time, not pre-tokenized
  font_id: string;
  font_size: number; // px, canvas-space (1080-wide reference)
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

`booklets.status` (`draft` | `published` | `disabled`) is the _only_ visibility gate. There is no separate staging copy of content — editing a published booklet edits it live, autosaving directly. This is a deliberate V1 simplification: the reader has no realtime subscription (fetches on page load only), so an already-open reader tab won't flicker mid-edit; only someone loading the link at the exact moment of a save sees a transient state, an accepted edge case. If heavier in-progress editing needs to happen without any visibility risk, the admin can temporarily flip the booklet back to `draft`, edit, then republish. **Do not build a draft/live fork (shadow content table + explicit publish step) without an explicit decision to revisit this** — it's a meaningful complexity jump that was deliberately deferred.

`disabled` is a third, distinct state from `draft`: both are publicly invisible (RLS only allows `published`), but they mean different things to the admin and must stay visually distinct in the admin UI. `draft` = "not ready yet, never been live." `disabled` = "was live at this exact `public_token`, intentionally revoked" — e.g. the admin wants to kill access without losing the link/content/page structure, or without it being mistaken for an in-progress edit. Toggling `draft → published` and `disabled → published` are _not_ the same action in the UI: re-enabling a `disabled` booklet restores public access at an already-known link, so it requires an explicit confirm step (the cost of an accidental click is higher than the first-ever publish of a fresh draft, where nobody has the link yet).

## Auth & multi-admin

Supabase Auth (email/password). Admin status is determined by membership in `admin_users` (a row referencing `auth.users.id`), checked via the `is_admin()` SQL function — **never hardcode a UID** in RLS policies or app logic. Adding a second admin later is a single `admin_users` INSERT, no migration, no code change.

## Public link

`booklets.public_token` is a randomly generated unguessable string (nanoid), not an admin-chosen slug. Since the reader has zero auth, the token is the only privacy boundary for a published booklet — don't make it guessable or sequential.

## TTS (word-click)

Browser `window.speechSynthesis` only — no external TTS service, per the brief. Word boundaries are determined by splitting `content` on whitespace **at render time** (not pre-tokenized in the DB) — both editor and reader use the same split logic in `TextElement`, but only the reader wires clicks to speech (editor mode keeps the text box itself as the drag/select target). Clicking a new word immediately cancels (`speechSynthesis.cancel()`) any in-progress utterance before speaking the new one — no queueing. `utterance.lang` set per content language (`he-IL` for Hebrew).

**Known external risk**: Hebrew voice availability/quality varies by browser/OS (solid on desktop Chrome/Edge; inconsistent on iOS Safari and Android depending on installed language packs). No client-side fix exists — handle "no voice available" gracefully rather than failing silently.

## Reader navigation convention

Booklet _content_ is English-language, so the reader's page-turn direction
follows standard LTR convention regardless of the admin UI's Hebrew/RTL
labeling (`DEFAULT_TEXT_ALIGN = 'right'` in `src/config/canvas.ts` is a
per-text-box default for admin convenience, not a statement about reading
direction): next = right-hand button / `ArrowRight` / swipe-left, previous =
left-hand button / `ArrowLeft` / swipe-right. Decided explicitly when
building the M8.5 reader-polish pass — don't re-litigate this without a
reason (e.g. if Hebrew-content booklets are added later, this would need to
become per-booklet rather than fixed).

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

Images uploaded to the `media` Storage bucket are shared across all booklets via `media_assets`. Deletion is only possible through the `delete_media_asset(id)` RPC (security definer, admin-gated, raises if any `page_elements.props->>'media_asset_id'` references it) — there is no raw DELETE RLS policy on `media_assets`, so this protection can't be bypassed by a direct API call. The RPC only removes the DB row (that's the part needing the "still referenced" guard); the admin client removes the Storage object as a separate follow-up call, same rollback-on-failure shape as the upload path below.

Every upload is resized/recompressed client-side before it ever reaches Storage — `src/lib/imageCompression.ts` (`compressImage`) downscales to fit `MEDIA_MAX_DIMENSION` (= `CANVAS_WIDTH`, no point storing pixels the canvas can't display) and re-encodes as WebP at `MEDIA_COMPRESS_QUALITY`, both in `src/config/media.ts`. This is what keeps the project inside Supabase's free-tier storage/bandwidth caps (see Deployment above) — a single uncompressed phone photo can be several MB. `media_assets.width`/`height` store the _compressed_ dimensions, not the original upload's.

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

## Clipboard system

Two independent editor-wide clipboards (`src/admin/editor/clipboard/`), both **owned by `BookletEditorPage`, not `PageElementEditor`** — that placement is the whole design. `PageElementEditor` is `key={pageId}` and remounts (fresh reducer + undo stack) on every page switch, so a clipboard living inside it could never survive a page change. Owning it one level up is what makes copy-on-page-A / paste-on-page-B work.

- **Element clipboard** (`useElementClipboard`): `copy` deep-clones (`structuredClone`) the selected element(s) so later edits to the live originals never mutate the clipboard; `takePaste(targetPageId, baseZIndex)` mints new `crypto.randomUUID()` ids, sets `page_id` to the target page, stacks z-index on top, and applies a cascading `CLIPBOARD_PASTE_OFFSET` (so consecutive pastes don't stack invisibly), cloning again so each paste is independent. Paste dispatches the **`ADD_ELEMENTS`** reducer action (one undo step for the whole paste) and selects the result. Cut = `copy` + existing `DELETE_ELEMENT`. New element ids guarantee no collisions across pages.
- **Page clipboard** (`usePageClipboard`): holds a copied page's *content in memory* (`{ elements, isQuizPage }`) — not just a page id — because Cut deletes the source from the DB and Paste must still recreate it afterwards.

**Keyboard split (two `window` keydown listeners, disjoint combos, no conflict):** element ops are plain `Ctrl` (`C`/`X`/`V`, bare `Delete`/`Backspace`, `Ctrl+Z`/`Y`/`Shift+Z`) handled in `PageElementEditor`; page ops are `Ctrl+Shift` (`C`/`X`/`V`/`D`, `Ctrl+Shift+Delete`) handled in `BookletEditorPage`. Both handlers ignore events while an `INPUT`/`TEXTAREA`/`SELECT` (or inline text-edit) is focused, so they never disrupt typing. Use `e.code` (physical key) for letters so the Hebrew admin layout / Caps Lock don't break them. Page actions are also exposed via a per-page dropdown menu in `PagesSidebar`.

**Page ops persist via RPCs** (`supabase/migrations/0003_page_clipboard_ops.sql`): `duplicate_page` and `insert_page_with_elements` follow the 0002 pattern (defer the `unique(booklet_id, page_order)` check, renumber, re-enforce "only the last page may be `is_quiz_page`") and reuse `save_page_elements`'s element-insert shape (incoming element `id`/`page_id` ignored, fresh ids minted). Before copying/cutting/duplicating the page **currently open** in the editor, `BookletEditorPage` first calls that page's `flushIfDirty` (parked in a ref by `PageElementEditor`) so the DB read isn't stale relative to un-debounced in-memory edits.

**Scope decision — no page-structural undo/redo.** Element ops are fully undoable via the per-page reducer, but page add/delete/duplicate/paste are server mutations with no in-memory history store, and `Ctrl+Z` is already element-undo inside the open page. A parallel page-history stack was deliberately *not* built (it cuts against the React-Query-as-source-of-truth design and "no premature abstraction"). Instead, page delete is guarded by a confirm dialog and Cut/Delete capture the page to the clipboard, so **Paste Page is the recovery path**. Revisit only with an explicit decision.

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
  index.css                      -- Tailwind theme+utilities (no Preflight) + scoped #admin-root/#reader-root resets + reader page-flip keyframes
  config/                       -- all magic numbers/tokens (no hardcoded values in components)
    admin.ts                     -- admin chrome layout constants (dashboard stack breakpoint)
    booklets.ts                  -- booklet library sort/filter defaults + types
    canvas.ts                    -- virtual canvas size, cover dims, pageCanvasSize(), DEFAULT_TEXT_ALIGN
    editor.ts                    -- undo cap, autosave debounce, selection-chrome (EDITOR_PRIMARY/…), inspector bounds, paste offset
    fonts.ts                     -- font weights, storage bucket, preview text
    media.ts                     -- media bucket, accepted types, compression max-dimension/quality
    quiz.ts                      -- iframe sandbox tokens (see "Quiz embed")
    reader.ts                    -- reader-only: page-flip duration/easing, swipe thresholds, max width, sheet thickness
    theme.ts                     -- brand palette (BRAND); authoritative source for index.css custom props + shadcn tokens
    tts.ts                       -- speech-synthesis rate bounds/defaults
    vocabulary.ts                -- vocabulary + credits panel sizing/slide constants
  lib/
    supabaseClient.ts
    queryClient.ts
    imageCompression.ts          -- client-side WebP downscale/recompress before upload
    utils.ts                     -- cn() shadcn class-merge helper
  types/
    database.ts                 -- Supabase row types
    elements.ts                 -- PageElement union, TextProps, BackgroundImageProps, VocabularyProps
  auth/
    AuthContext.tsx
    RequireAuth.tsx
  renderer/                     -- SHARED — imported unmodified by admin and reader, never forked (no Tailwind)
    PageCanvas.tsx
    useCanvasScale.ts
    elements/
      TextElement.tsx
      BackgroundImageElement.tsx
      VocabularyElement.tsx
      registry.tsx               -- per-type element renderer dispatch table
  tts/
    useWordSpeech.tsx            -- WordSpeechProvider + word-click speech context
    SpeechRateControl.tsx
  quiz/
    QuizEmbed.tsx                -- sandboxed iframe srcdoc renderer
  admin/                        -- admin chrome (shadcn/ui + Tailwind, under #admin-root)
    routes.tsx
    LoginPage.tsx
    DashboardPage.tsx
    BookletListPage.tsx          -- slim: orchestration only (cards/skeleton/shell extracted)
    BookletEditorPage.tsx        -- owns both editor clipboards + page-op keyboard (see "Clipboard system")
    BookletLibraryToolbar.tsx    -- search/status-filter/sort controls
    bookletLibraryFilters.ts     -- pure filter/sort/count helpers
    shell/                       -- shared admin page shell (kills the 5-page duplication)
      AdminPageShell.tsx         -- #admin-root + brand backdrop + background shapes + centered content
      AdminBackgroundShapes.tsx  -- decorative shapes as data, one renderer, per-page variants
      AdminPageHeader.tsx        -- back-link pill + title + subtitle + icon badge (green/pink accent)
      EmptyState.tsx             -- dashed empty-state card (+ optional action button)
      adminControls.ts           -- CARD_COLORS palette, inputStyle(), submitButtonStyle(), cardShadow(), BTN_BASE, ADMIN_FONT
    booklets/
      BookletCard.tsx            -- one booklet card (status-dependent actions)
      BookletCardSkeleton.tsx
    editor/
      EditorCanvas.tsx
      EditorOverlay.tsx          -- drag/selection/resize-handle logic only
      TextEditOverlay.tsx        -- in-place inline text-edit textarea (extracted from EditorOverlay)
      ActionBubbleButton.tsx     -- one round button in the floating action bubble (extracted)
      EditorToolbar.tsx
      ElementInspector.tsx
      PageElementEditor.tsx
      PageThumbnail.tsx          -- miniature canvas preview used in PagesSidebar
      PagesSidebar.tsx           -- left panel: page list, add/duplicate/copy/cut/paste/delete, navigate
      useEditorReducer.ts        -- element tree + undo/redo
      useAutosave.ts
      useTextMeasurements.ts     -- measures rendered text glyph bounds -> selection box geometry
      MediaLibraryPicker.tsx     -- standalone /admin/media page + embeddable picker; uses the shell
      QuizEmbedEditor.tsx
      clipboard/                 -- editor-wide clipboards (see "Clipboard system")
        useElementClipboard.ts   -- copy/cut/paste elements, cross-page, new ids on paste
        usePageClipboard.ts      -- copy/cut/paste whole pages (payload held in memory)
    fonts/
      FontManagerPage.tsx
      FontCard.tsx               -- one registered-font specimen row
      FontPreview.tsx
  reader/                       -- public reader chrome (plain Tailwind under #reader-root; imports renderer/ unmodified)
    ReaderBookletPage.tsx        -- chrome root (#reader-root): orchestration, cover/back-cover state machines, side rail
    ReaderBgShapes.tsx           -- reader-side decorative background shapes
    ReaderLoadingState.tsx       -- full-screen loading skeleton
    ReaderError.tsx              -- full-screen error/empty state
    NavArrow.tsx                 -- prev/next page arrow (desktop flank + mobile bar)
    useReaderKeyboard.ts         -- single keydown listener unifying the cover/back-cover arrow-key actions
    PageFlip.tsx                 -- booklet-agnostic 3D page-turn (CSS-keyframe two-layer flip, swipe, keyboard, reduced-motion)
    PageNav.tsx
    BookCover.tsx                -- front cover open/close animation
    BookBackCover.tsx            -- back cover enter/exit animation
    VocabularyPanel.tsx          -- slide-in-from-left per-page dictionary panel
    UnavailableBookletPage.tsx   -- draft/disabled/not-found reader fallback
    prefersReducedMotion.ts
    useCoverImageReady.ts        -- gate first paint until the cover image decodes
    useNextPagePreloader.ts      -- preload adjacent spreads' images
    pageFlipAudio.ts             -- page-turn sound buffer
    usePageFlipSound.ts          -- play page-turn sound on flip
  components/                   -- neutral shared UI (admin + reader)
    CreditsPanel.tsx             -- slide-in credits panel (used by reader + admin Login/Dashboard)
    Spinner.tsx
    StatusBadge.tsx
    ui/                          -- shadcn/ui generated components (badge, card, dialog, dropdown-menu, separator, slider, tooltip, …)
  hooks/
    useBookletQuery.ts            -- React Query hooks (list + by-token reader query)
    useFontsQuery.ts               -- fonts list + register-font mutation
    useFontFace.ts                 -- load a registered @font-face on demand
    useMediaAssetQuery.ts          -- single media asset by id
    useMediaLibraryQuery.ts        -- media list + upload/delete mutations
    usePageElementsQuery.ts        -- page_elements load + save
    usePagesQuery.ts               -- pages load + structural RPC mutations
    useViewportWidth.ts            -- viewport width/height hooks (neutral: admin + reader)
scripts/
  convert-fonts.mjs               -- re-runnable TTF/OTF -> WOFF2
fonts/                             -- source TTF/OTF files (input to the script above)
public/
  _redirects                      -- unused leftover from the earlier Cloudflare Pages plan; live SPA fallback is vercel.json's rewrites
api/
  keep-alive.ts                    -- Vercel serverless function, hit by vercel.json's Cron Job to keep the free-tier Supabase project awake
vercel.json                        -- SPA rewrites + Cron Job schedule for api/keep-alive.ts
supabase/
  migrations/
    0001_init.sql
    0002_page_management.sql        -- add/delete/reorder page RPCs
    0003_page_clipboard_ops.sql     -- duplicate_page + insert_page_with_elements RPCs
    0004_cover_page.sql             -- is_cover column + add_cover_page RPC + cover pinned at order 0
    0005_booklet_background_color.sql -- per-booklet reader backdrop color
    0006_back_cover_page.sql        -- is_back_cover column + back-cover RPC
    0007_fix_add_page_before_back_cover.sql
    0008_quiz_on_last_spread.sql    -- show_quiz_on_last_spread flag (quiz now on the back cover)
docs/
  milestones/                      -- M0..M12, one file per milestone
  refactor-milestones/             -- R0..R5 clean-architecture refactor (this pass)
CLAUDE.md
```

## Supabase Schema

RLS enabled on every table. Admin check via a reusable function, never a hardcoded UID:

```sql
create function is_admin() returns boolean as $$
  select exists (select 1 from admin_users where id = auth.uid())
$$ language sql security definer stable;
```

**Migrations must explicitly `GRANT` base table privileges to `anon`/`authenticated`.** RLS policies only filter rows — Postgres still requires the underlying `GRANT` before either role can touch a table at all. Supabase's Table Editor adds this automatically for tables created through the UI, but raw SQL migrations (the only way this project creates tables) do not get it for free. Every migration that adds a table must pair it with a `grant select/insert/update/delete ... to anon, authenticated` block sized to that table's RLS policy (see `supabase/migrations/0001_init.sql` for the pattern). RPC functions (`security definer`) don't need this — they run as the function owner regardless of caller grants.

### `admin_users`

| column     | type                      | notes                       |
| ---------- | ------------------------- | --------------------------- |
| id         | uuid PK                   | references `auth.users(id)` |
| email      | text not null             |                             |
| created_at | timestamptz default now() |                             |

RLS: `is_admin()` only.

### `fonts`

| column       | type                              | notes                                |
| ------------ | --------------------------------- | ------------------------------------ |
| id           | uuid PK default gen_random_uuid() |                                      |
| name         | text not null                     | e.g. "Andika New Basic"              |
| weight       | text not null                     | regular / bold / italic / bolditalic |
| storage_path | text not null                     | `fonts/<slug>.woff2`                 |
| created_at   | timestamptz default now()         |                                      |
|              |                                   | unique(name, weight)                 |

RLS: SELECT public (`true`). INSERT/UPDATE/DELETE `is_admin()`.

### `media_assets`

| column         | type                              | notes                           |
| -------------- | --------------------------------- | ------------------------------- |
| id             | uuid PK default gen_random_uuid() |                                 |
| storage_path   | text not null                     | `media/<id>.<ext>`              |
| file_name      | text not null                     | original name, admin UI display |
| width / height | int                               | optional aspect-ratio hints     |
| created_by     | uuid references admin_users(id)   |                                 |
| created_at     | timestamptz default now()         |                                 |

RLS: SELECT public (`true`). INSERT/UPDATE `is_admin()`. **No DELETE policy** — deletion only via `delete_media_asset(id)` RPC (security definer, admin-gated, raises if referenced). Index on `storage_path`.

### `booklets`

| column                  | type                              | notes                                                         |
| ----------------------- | --------------------------------- | ------------------------------------------------------------- |
| id                      | uuid PK default gen_random_uuid() |                                                               |
| public_token            | text not null unique              | random nanoid, public URL `/b/:public_token`                  |
| title                   | text not null                     | admin-facing only                                             |
| status                  | text not null default 'draft'     | 'draft' \| 'published' \| 'disabled', constrained via `check` |
| canvas_width            | int not null default 1920         |                                                               |
| canvas_height           | int not null default 1080         |                                                               |
| quiz_embed_code         | text                              | raw Fillout snippet, nullable                                 |
| quiz_embed_height       | int default 600                   | iframe height for inline-style embeds                         |
| created_by              | uuid references admin_users(id)   |                                                               |
| created_at / updated_at | timestamptz default now()         |                                                               |

RLS: SELECT public only where `status = 'published'`; `is_admin()` sees all. Writes `is_admin()`.

### `pages`

| column       | type                                                    | notes                                                                              |
| ------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| id           | uuid PK default gen_random_uuid()                       |                                                                                    |
| booklet_id   | uuid not null references booklets(id) on delete cascade |                                                                                    |
| page_order   | int not null                                            | 0-based sequence                                                                   |
| is_quiz_page | boolean not null default false                          | flags the final page to render `quiz_embed_code` instead of elements               |
| is_cover     | boolean not null default false                          | flags the booklet's front cover; pinned to `page_order = 0`, ≤1 per booklet        |
| created_at   | timestamptz default now()                               |                                                                                    |
|              |                                                         | unique(booklet_id, page_order) deferrable initially immediate, index on booklet_id; partial unique index `pages_one_cover_per_booklet on (booklet_id) where is_cover` |

RLS: SELECT public if parent booklet is published; `is_admin()` sees all. Writes `is_admin()` (via `add_page`/`delete_page`/`reorder_pages`/`add_cover_page` RPCs in practice — see below).

`page_order` is renumbered across multiple rows at once on add/delete/reorder (e.g. swapping two pages' order, or compacting the gap left by a delete). A plain `unique(booklet_id, page_order)` constraint is checked per-row immediately, even within a single multi-row `UPDATE`, so that renumbering would transiently collide. The constraint is `deferrable initially immediate` specifically so `add_page`/`delete_page`/`reorder_pages` (`supabase/migrations/0002_page_management.sql`) — and the clipboard RPCs `duplicate_page`/`insert_page_with_elements` (`0003_page_clipboard_ops.sql`), which also open a gap by shifting later pages down one — can `set constraints ... deferred` and renumber freely within the transaction. All of those RPCs re-enforce "only the last page may be `is_quiz_page`" after every structural change, since adding/deleting/reordering/inserting pages can silently demote the page that used to be last.

### Front cover

A booklet may have one **front cover**: a `pages` row flagged `is_cover`, pinned to `page_order = 0` (added by `add_cover_page(booklet_id)` in `supabase/migrations/0004_cover_page.sql`, which pushes existing pages down and inserts at order 0; a partial unique index enforces ≤1 cover per booklet). The cover is **not a separate table** — it reuses `page_elements`, `save_page_elements`, the editor, and the shared renderer. `reorder_pages` was updated to **pin the cover at order 0** regardless of the incoming array; `add_page`/`delete_page`/`insert_page_with_elements`/`duplicate_page` already leave it first. Booklets without a cover behave exactly as before (no auto-backfill).

A cover's canvas size is **derived from `is_cover`, never stored** — `COVER_CANVAS_WIDTH × COVER_CANVAS_HEIGHT` = `CANVAS_WIDTH/2 × CANVAS_HEIGHT` (portrait 960×1080, exactly the right half of a spread). `pageCanvasSize(isCover)` in `src/config/canvas.ts` is the single source of truth for these dims. The shared renderer takes this as **optional props** (`PageCanvas`'s `canvasWidth`/`canvasHeight`, `useCanvasScale`'s `canvasWidth`), defaulting to the full spread — threaded through, never forked. Full design: `docs/cover-front-milestones/`.

### `page_elements`

| column                  | type                                                 | notes                                                                      |
| ----------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| id                      | uuid PK default gen_random_uuid()                    |                                                                            |
| page_id                 | uuid not null references pages(id) on delete cascade |                                                                            |
| type                    | text not null                                        | 'text' \| 'background_image' (V1); future types added with zero migrations |
| z_index                 | int not null default 0                               |                                                                            |
| x, y, w, h              | numeric not null                                     | canvas-space px                                                            |
| rotation                | numeric not null default 0                           | included now to avoid a later migration                                    |
| props                   | jsonb not null default '{}'                          | type-specific shape, see §3 above                                          |
| created_at / updated_at | timestamptz default now()                            |                                                                            |
|                         |                                                      | index on page_id, index on (page_id, z_index)                              |

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
- M12 — Polish & UX (reader page-flip/nav/loading-state polish pulled forward early, between M8 and M9 — see `PageFlip.tsx`; remaining M12 scope is everything else in `docs/milestones/M12-polish.md`)

## UI component library — scope boundary

Admin interface (forms, lists, dialogs, navigation — everything outside
the canvas) uses **shadcn/ui** + Tailwind CSS. The shared admin page frame
lives in **`src/admin/shell/`** (`AdminPageShell` + background shapes +
`AdminPageHeader` + `EmptyState` + `adminControls` style tokens) — the
single home for admin chrome, so **every admin page = `AdminPageShell` +
`AdminPageHeader` + body** (~15 lines, not 250 of copy-paste), and a
color/shadow/background change is one edit. The public reader's chrome
(everything around `PageCanvas`: page-flip container, nav, loading/error
states — `src/reader/*` excluding nothing it imports from `src/renderer/`)
uses plain Tailwind utilities under its own `#reader-root` scope, the same
mechanism as `#admin-root` (see below) — not shadcn components (no forms,
no admin-style chrome needed there), just utility classes for layout,
shadows, and the page-flip CSS animation.

**Hard boundary: `src/renderer/` (PageCanvas and all element renderers)
NEVER uses Tailwind classes or relies on Tailwind's global reset/preflight.**
This is the WYSIWYG-critical code — it must render identically regardless
of what CSS framework styles the surrounding admin or reader chrome.

Implementation (`src/index.css`): Tailwind's Preflight layer is not
imported at all — only `tailwindcss/theme.css` and `tailwindcss/utilities.css`
are, so no global `*`/element-selector reset ever reaches `renderer/`. A
small hand-rolled reset (box-sizing, margin/padding, form-control font
inheritance) is scoped under `#admin-root` **and** `#reader-root` instead —
two independent chrome mount points, same isolation rule, neither one ever
reaching `src/renderer/`. Tailwind v4 does not honor a JS-config
`important: '#selector'` option via `@config` (confirmed empirically — it
silently no-ops), so the real containment guarantee is the hard rule above:
a utility class sitting unused in the compiled stylesheet can't affect an
element that was never given that class. No `tailwind.config.js` is used —
content is detected automatically by the Tailwind v4 PostCSS plugin.

If you're ever unsure whether a new piece of UI belongs to "chrome" (admin
or reader → Tailwind OK, under the matching `#…-root`) or "the canvas"
(→ isolated, no Tailwind) — stop and ask.

## Git branching

Work directly on `main` for routine milestone work — commits are already
small and frequent. Create a feature branch (`git checkout -b m8-editor-canvas`)
only when:

- A milestone involves substantial structural risk (e.g. M8's drag/resize
  mechanics, any schema migration that's hard to reverse).
- I explicitly ask for one.
  Merge back to `main` once the milestone is verified and approved, then
  delete the branch.
