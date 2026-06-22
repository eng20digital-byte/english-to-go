---
name: commit
description: Stage and commit changes using conventional commit prefixes (feat:/fix:/docs:/chore:/refactor:/test:). Before committing, always run lint and typecheck, and verify whether CLAUDE.md needs updating. When the user explicitly says "commit", "end the milestone", "wrap up this milestone", "save progress", or similar, prepare a commit and ask for final confirmation before executing it. Additionally, whenever a substantial task, feature, milestone, refactor, or multi-step implementation is completed, proactively suggest creating a commit. Summarize the completed work and ask whether a commit should be created. Never create a git commit automatically without user approval. Always request confirmation first.
---

# commit

Creates a git commit for this repo using the conventional-commit format
(`type: short description`), replacing the freeform style used in early
history (`M0: repo & tooling scaffold`, etc.). Use this any time the user
asks to commit, and especially at the end of a milestone (see
`CLAUDE.md` → "Working process": one milestone at a time, small focused
commits, stop and report after).

Only run this when the user has explicitly asked to commit — invoking
this skill counts as that request.

## Steps

### 1. Survey the change

```bash
git status
git diff
git diff --staged
git log --oneline -10
```

Read the diff yourself — don't guess the commit type from filenames
alone. If there are unrelated changes mixed together (e.g. an
unfinished milestone plus an unrelated fix), ask the user whether to
split into separate commits rather than bundling them.

### 2. Run the quality gates

This repo's milestone workflow requires not committing broken code at a
milestone boundary:

```bash
npm run lint
npm run build   # tsc -b (typecheck) && vite build — there is no separate typecheck script
```

There is no test script in this repo currently — don't invent one. If
both pass, continue. If either fails, fix the issue (or tell the user
exactly what failed) before committing — don't commit broken code and
don't use `--no-verify` to skip hooks.

### 3. Check whether CLAUDE.md needs updating

`CLAUDE.md` says explicitly: "Keep this updated in the same commit
whenever a milestone introduces a new convention, config location, or
architectural decision — it must never go stale."

Look at the diff and ask: did this change introduce any of —
- a new folder/file convention not already documented in the "Folder
  structure" section
- a new config location (something that should live in `src/config/`
  but is described differently, or a new constant category)
- a schema change not reflected in the "Supabase Schema" section
- an architectural decision (e.g. a new pattern, a deviation from one
  of the locked decisions in CLAUDE.md)

If yes, update `CLAUDE.md` now and include it in the same commit. If
the change is routine implementation work with no new convention,
skip this — don't edit CLAUDE.md just to touch it.

### 4. Choose the commit type

| Prefix | When |
|---|---|
| `feat:` | New functionality — most milestone work (new page, new component, new capability) |
| `fix:` | Bug fix |
| `docs:` | Docs-only change (CLAUDE.md, docs/, README) |
| `chore:` | Tooling/config/deps with no behavior change (lint config, package bumps, scaffolding) |
| `refactor:` | Restructuring with no behavior change |
| `style:` | Formatting only, no logic change |
| `test:` | Test-only changes |

Format: `type: short imperative description`, lowercase after the
colon, no trailing period, no scope prefix like `(editor)`. Keep it
under ~70 characters. Add a body (1-3 sentences, why not what) only if
the one-liner doesn't carry enough context — same bar as this repo's
existing commit bodies (see `e981381` for a good example).

If the commit completes a milestone from `docs/milestones/`, it's fine
to name the milestone in the body (not the title) — e.g. "Completes M7
scope: booklet list, create, rename, delete." Don't put the milestone
ID in the title; conventional-commit type prefixes take that slot now.

### 5. Stage specific files

Add files by name, not `git add -A` — this avoids accidentally staging
stray files (`.env`, editor scratch files, etc.). Cross-check
`git status` for anything that shouldn't be committed (secrets,
build output, `node_modules`) before staging.

```bash
git add <file1> <file2> ...
```

### 6. Commit

Use a heredoc so multi-line messages format correctly:

```bash
git commit -m "$(cat <<'EOF'
feat: short imperative description

Optional 1-3 sentence body explaining why, not what.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7. Confirm and report

```bash
git status
```

Report back to the user: the commit message used, what was included,
and (per CLAUDE.md's working process) that you're stopping here to
report what was built and wait for explicit go-ahead before starting
the next milestone — don't chain into further work automatically.

## Notes

- Never push. This skill only commits locally; pushing is a separate,
  explicit ask.
- Never amend. If a hook or gate fails after staging, fix the issue,
  re-stage, and create a new commit rather than amending.
- If `git status` shows nothing to commit, say so — don't invent an
  empty commit.
