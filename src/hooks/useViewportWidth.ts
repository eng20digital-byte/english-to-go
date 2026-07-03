import { useEffect, useState } from 'react';

// Tracks the viewport width (window.innerWidth) so reader chrome can adapt its
// layout to small screens — the Dictionary panel's width cap / column count and
// the nav-arrow/padding sizing both key off this. Reader-only (under
// #reader-root), never touches the shared renderer. Kept as a tiny standalone
// hook rather than inline listeners so both consumers share one resize source.
export function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    // Sync once on mount in case the width changed between the initial render
    // and the effect firing (e.g. an orientation change during hydration).
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}

// Same as above for the viewport HEIGHT — used where "short screen" matters more
// than "narrow screen" (e.g. the Credits card shrinks on a low viewport so it
// doesn't hog the vertical rail).
export function useViewportHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight,
  );

  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return height;
}
