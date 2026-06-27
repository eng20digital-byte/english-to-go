import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import {
  TEXT_MEASURE_EPSILON,
  TEXT_MEASURE_MAX_ATTEMPTS,
  TEXT_EMPTY_MIN_WIDTH,
} from '@/config/editor';
import type { PageElement } from '@/types/elements';

// The selection box for a text element must match the text *as rendered*, not
// the stored frame w/h (which is only the wrapping width plus an unused
// height). We read the real rendered glyph bounds via a DOM Range over the
// element's text node: `Range.getBoundingClientRect()` returns the tight union
// of every line box, so this inherently accounts for font family / size /
// weight, line breaks, line height, letter spacing, alignment and wrapping —
// because it reads the exact layout the browser produced, not a re-derivation.
//
// Offsets are returned relative to the element's wrapper origin so the box
// tracks a move drag for free (moving the wrapper shifts x/y but never reflows
// the glyphs) and only re-measures when a wrapping-affecting prop changes.
export interface TextContentBox {
  offsetX: number; // canvas-space px, relative to the element's x
  offsetY: number; // canvas-space px, relative to the element's y
  width: number; // canvas-space px
  height: number; // canvas-space px
}

// Reads the DOM directly (text wrappers are tagged by PageCanvas) so it needs
// no element data — keeping the measure step a pure, render-free DOM read.
function measureTextBoxes(container: HTMLElement, scale: number): Map<string, TextContentBox> {
  const result = new Map<string, TextContentBox>();
  const wrappers = container.querySelectorAll<HTMLElement>('[data-element-type="text"]');
  for (const wrapper of wrappers) {
    const id = wrapper.dataset.elementId;
    // The wrapper's only child is the text renderer's root <div>; its child
    // nodes are the word spans + whitespace text nodes we want to bound.
    const textRoot = wrapper.firstElementChild;
    if (!id || !textRoot) continue;

    const range = document.createRange();
    range.selectNodeContents(textRoot);
    const content = range.getBoundingClientRect();
    const frame = wrapper.getBoundingClientRect();

    // Both rects already include PageCanvas's `transform: scale()`, so divide
    // it back out to land in canvas-space px. (Rotation is always 0 in V1 — no
    // UI sets it — so axis-aligned client rects are exact here.)
    let offsetX = (content.left - frame.left) / scale;
    let offsetY = (content.top - frame.top) / scale;
    let width = content.width / scale;
    let height = content.height / scale;

    if (width < TEXT_MEASURE_EPSILON || height < TEXT_MEASURE_EPSILON) {
      // Empty content has no glyph box to measure — keep it selectable with a
      // caret-sized fallback from the text's own computed line height (a px
      // value in canvas-space, unaffected by the ancestor scale transform).
      const lineHeightPx = parseFloat(getComputedStyle(textRoot as HTMLElement).lineHeight);
      offsetX = 0;
      offsetY = 0;
      width = TEXT_EMPTY_MIN_WIDTH;
      height = Number.isFinite(lineHeightPx) ? lineHeightPx : TEXT_EMPTY_MIN_WIDTH;
    }

    result.set(id, { offsetX, offsetY, width, height });
  }
  return result;
}

function boxesEqual(a: Map<string, TextContentBox>, b: Map<string, TextContentBox>): boolean {
  if (a.size !== b.size) return false;
  for (const [id, box] of a) {
    const other = b.get(id);
    if (!other) return false;
    if (
      Math.abs(box.offsetX - other.offsetX) > TEXT_MEASURE_EPSILON ||
      Math.abs(box.offsetY - other.offsetY) > TEXT_MEASURE_EPSILON ||
      Math.abs(box.width - other.width) > TEXT_MEASURE_EPSILON ||
      Math.abs(box.height - other.height) > TEXT_MEASURE_EPSILON
    ) {
      return false;
    }
  }
  return true;
}

// Measures every text element's rendered glyph box, keyed by element id.
// `elements` should be the same array PageCanvas renders (i.e. including any
// live drag/resize override) so the measurement matches what's on screen.
export function useTextMeasurements(
  containerRef: RefObject<HTMLElement | null>,
  elements: PageElement[],
  scale: number,
): Map<string, TextContentBox> {
  const [boxes, setBoxes] = useState<Map<string, TextContentBox>>(() => new Map());

  // Only props that change the glyph layout belong in the re-measure key.
  // x / y / rotation translate the wrapper without reflowing its contents, so
  // excluding them keeps the box stable (and avoids forced reflows) during a
  // move drag — the box still follows because EditorOverlay adds the element's
  // live x/y to the cached offsets.
  const signature = useMemo(
    () =>
      elements
        .filter((el): el is Extract<PageElement, { type: 'text' }> => el.type === 'text')
        .map(
          (el) =>
            `${el.id}|${el.w}|${el.props.content}|${el.props.font_id}|` +
            `${el.props.font_size}|${el.props.line_height}|${el.props.align}|${el.props.direction}`,
        )
        .join('\n'),
    [elements],
  );

  // useLayoutEffect (not useEffect): measure + commit before paint so the
  // selection chrome never flashes the old/frame size for a frame.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || scale <= 0) return;

    let frameId = 0;
    let attempts = 0;
    let previous: Map<string, TextContentBox> | null = null;

    // Measure now, then keep re-measuring for a few frames until the result
    // stabilizes — this is what catches async web-font loads that change text
    // metrics after the first paint.
    const tick = () => {
      const next = measureTextBoxes(container, scale);
      setBoxes((prev) => (boxesEqual(prev, next) ? prev : next));

      const stable = previous !== null && boxesEqual(previous, next);
      previous = next;
      attempts += 1;
      if (!stable && attempts < TEXT_MEASURE_MAX_ATTEMPTS) {
        frameId = requestAnimationFrame(tick);
      }
    };
    tick();

    return () => cancelAnimationFrame(frameId);
  }, [containerRef, signature, scale]);

  return boxes;
}
