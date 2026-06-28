// Shared prefers-reduced-motion check for the reader chrome (cover open/close
// animations, etc.). Computed fresh on every call rather than cached — the
// user's OS-level setting can change while the reader stays open.
//
// PageFlip keeps its OWN private copy on purpose: it predates this helper and
// its flip mechanics are self-contained, so it stays untouched here.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
