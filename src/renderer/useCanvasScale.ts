import { useEffect, useState, type RefObject } from 'react';
import { CANVAS_WIDTH } from '@/config/canvas';

// The caller's container is expected to maintain the canvas's 1920:1080
// (16:9 landscape) aspect ratio itself (CSS `aspect-ratio`) — see CLAUDE.md
// "Fixed virtual canvas, scaled to fit". Container width alone determines
// the scale factor; height follows the same ratio automatically.
export function useCanvasScale(containerRef: RefObject<HTMLElement | null>) {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / CANVAS_WIDTH);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [containerRef]);

  return scale;
}
