# M11 — Quiz Embed (Final Page)

## Goal
The booklet's final page can display a Fillout quiz embed, rendered securely isolated from the app's DOM and Supabase session.

## Scope
- `src/config/quiz.ts` — the sandbox token string as a named constant, default iframe height.
- `src/admin/editor/QuizEmbedEditor.tsx` — textarea on the booklet editor for pasting the raw Fillout snippet into `booklets.quiz_embed_code`, plus a `quiz_embed_height` number input.
- `src/quiz/QuizEmbed.tsx` — renders an `<iframe sandbox="..." srcdoc="...">` wrapping the raw snippet in a minimal HTML document. Sandbox tokens and the reasoning for omitting `allow-same-origin` documented as a code comment here (the "why," per the project's commenting standard) and cross-referenced in CLAUDE.md.
- Reader wiring: when rendering a page with `is_quiz_page = true`, render `QuizEmbed` (using the parent booklet's `quiz_embed_code`/`quiz_embed_height`) instead of `PageCanvas` for that page.

## Out of scope
No analytics/tracking of quiz completion — out of scope per the brief.

## Manual verification
1. Paste a real Fillout popup-style embed snippet into the editor, save, publish.
2. On the public reader's last page, confirm the embed button renders and clicking it opens the Fillout popup correctly.
3. Open browser DevTools on the reader page while the quiz page is showing — confirm the iframe has no access to `document.cookie` or `localStorage` of the parent (e.g. attempt `iframe.contentWindow.document` from the parent console and confirm it throws/is blocked, demonstrating the opaque-origin isolation).
4. Submit a test response through the popup — confirm it reaches Fillout (their own confirmation UI shows).
