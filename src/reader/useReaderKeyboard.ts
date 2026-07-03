import { useEffect } from 'react';
import type { ReaderBooklet } from '@/hooks/useBookletQuery';

type CoverState = 'closed' | 'opening' | 'closing' | 'open';

interface ReaderKeyboardOptions {
  booklet: ReaderBooklet | null | undefined;
  coverState: CoverState;
  pageIndex: number;
  showBackCover: boolean;
  isFlipping: boolean;
  onOpenCover: () => void;
  onCloseCover: () => void;
  onEnterBackCover: () => void;
  onExitBackCover: () => void;
}

// Single keydown listener unifying the four formerly-separate arrow-key effects
// in ReaderBookletPage (open cover / close cover / enter back cover / exit back
// cover). Each action keeps its exact original guard, and all guards are
// recomputed from `booklet` on every relevant change — so behavior (including
// the ArrowLeft case where both close-cover and exit-back-cover can fire) is
// identical to the previous four listeners. PageFlip mounts its own arrow-key
// handling only while the open book is showing, and those cases are guarded on
// `!showCover` / `!showBackCover` here, so there is no conflict.
export function useReaderKeyboard({
  booklet,
  coverState,
  pageIndex,
  showBackCover,
  isFlipping,
  onOpenCover,
  onCloseCover,
  onEnterBackCover,
  onExitBackCover,
}: ReaderKeyboardOptions) {
  useEffect(() => {
    if (!booklet) return;
    const cover = booklet.pages.find((p) => p.is_cover) ?? null;
    const backCover = booklet.pages.find((p) => p.is_back_cover) ?? null;
    const spreads = booklet.pages.filter((p) => !p.is_cover && !p.is_back_cover);
    const clampedIndex = Math.min(pageIndex, Math.max(0, spreads.length - 1));
    const showCover = cover !== null && coverState !== 'open';

    const canOpen = showCover;
    const canClose = cover !== null && coverState === 'open' && clampedIndex === 0;
    const canExitBack = showBackCover && !isFlipping && !showCover;
    const canEnterBack =
      clampedIndex === spreads.length - 1 &&
      backCover !== null &&
      !showBackCover &&
      !showCover &&
      !isFlipping;

    if (!canOpen && !canClose && !canExitBack && !canEnterBack) return;

    function handleKeyDown(event: KeyboardEvent) {
      // While the cover is closed, ArrowRight / Enter open it.
      if (canOpen && (event.key === 'ArrowRight' || event.key === 'Enter')) {
        event.preventDefault();
        onOpenCover();
        return;
      }
      if (event.key === 'ArrowRight') {
        // At the last spread, ArrowRight enters the back cover.
        if (canEnterBack) {
          event.preventDefault();
          onEnterBackCover();
        }
        return;
      }
      if (event.key === 'ArrowLeft') {
        // ArrowLeft can both re-close the front cover (at spread 0) and exit the
        // back cover; the two guards are mutually compatible, and firing both
        // matches the prior two independent listeners.
        if (canClose) {
          event.preventDefault();
          onCloseCover();
        }
        if (canExitBack) {
          event.preventDefault();
          onExitBackCover();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    booklet,
    coverState,
    pageIndex,
    showBackCover,
    isFlipping,
    onOpenCover,
    onCloseCover,
    onEnterBackCover,
    onExitBackCover,
  ]);
}
