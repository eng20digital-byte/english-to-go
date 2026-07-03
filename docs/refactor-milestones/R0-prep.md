# R0 — Prep & Baseline

**Goal:** Establish a safety net before touching anything, and remove dead
scaffolding.

## Steps

1. Create the working branch:
   ```
   git checkout -b refactor-clean-architecture
   ```
2. Run `typecheck` and `build`. Record that both are green — this is the
   comparison point for every later milestone.
3. Capture a quick baseline of how each screen looks (a manual pass or
   screenshots of): Login, Dashboard, Booklets list, Font Library, Media
   Library, Reader, Editor. Every later milestone is verified against this.
4. Delete the two dead placeholder files (their folders now contain real files):
   - `src/tts/.gitkeep`
   - `src/quiz/.gitkeep`

## Verification

- `build` is green.
- The app launches and all screens above render exactly as before.

## Out of scope

- No component or structural changes yet — this milestone only sets up the
  branch, baseline, and removes dead files.
