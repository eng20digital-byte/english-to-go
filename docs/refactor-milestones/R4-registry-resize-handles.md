# R4 — Registry-Driven Resize Handles (DEFERRED — do not build yet)

**Status: intentionally deferred. Do not implement this until a third element
type actually needs it.**

## Context

The drag/resize system in `admin/editor/EditorOverlay.tsx` is **already unified
and correct** — a single implementation (`computeGeometry`, `startDrag`,
`handlePointerMove`, `handlePointerUp`) serves every element type. The only
per-type branching lives in two small functions:

- `getSelectionRect` — text uses the measured glyph box; others use the stored frame.
- `getHandles` — text gets two side handles (width-only); others get corner handles.

Both branch on `element.type === 'text'`. With only two element types, this is
the right amount of structure. **Leave it as is.**

## The future change (only when it's needed)

When a **third** element type is added and it needs different resize behavior,
the `if (element.type === 'text')` checks will start to grow into a chain. At
that point — not before — move the resize behavior into the element registry:

- Add a field to each entry in `src/renderer/elements/registry.tsx`, e.g.
  `resizeMode: 'width-only' | 'free'`.
- Have `getHandles` / `getSelectionRect` read that field from the registry
  instead of checking `type`.

This keeps the "add a new element type = pure app-layer addition" promise intact
even as resize behavior diversifies.

## Why deferred

Building this now, with two types, is premature abstraction — exactly what the
CLAUDE.md code-quality bar warns against ("simple and direct beats a generic
framework for hypothetical needs"). This file exists only so the idea isn't lost.
