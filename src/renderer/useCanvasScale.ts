import { useLayoutEffect, useState, type RefObject } from 'react';
import { CANVAS_WIDTH } from '@/config/canvas';

// The caller's container is expected to maintain the canvas's 1920:1080
// (16:9 landscape) aspect ratio itself (CSS `aspect-ratio`) — see CLAUDE.md
// "Fixed virtual canvas, scaled to fit". Container width alone determines
// the scale factor; height follows the same ratio automatically.
export function useCanvasScale(
  containerRef: RefObject<HTMLElement | null>,
  // Defaults to the full spread width; a cover passes COVER_CANVAS_WIDTH so the
  // narrower portrait canvas scales to fill its (also narrower) container.
  canvasWidth: number = CANVAS_WIDTH,
) {
  const [scale, setScale] = useState(0);

  // useLayoutEffect (not useEffect) + a synchronous first measurement, so the
  // real scale is set BEFORE the browser's first paint. The component renders
  // once at the initial scale 0 (which makes PageCanvas `transform: scale(0)` —
  // i.e. collapsed to an invisible point); a ResizeObserver callback is async
  // (it fires after paint) even when the observer is created here, so relying on
  // it alone leaves that scale-0 frame visible for one tick. That blank frame is
  // exactly the flicker seen when a fresh canvas mounts — most visibly at the
  // cover→book handoff (BookCover unmounts, PageFlip mounts from scratch). The
  // direct measurement below resolves layout synchronously and setScale in a
  // layout effect re-renders before paint, so the scale-0 frame never reaches
  // the screen. The observer then only handles subsequent (resize) changes.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    setScale(element.getBoundingClientRect().width / canvasWidth);

    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / canvasWidth);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [containerRef, canvasWidth]);

  return scale;
}
