import { useEffect, useRef } from 'react';
import {
  PAGE_FLIP_SOUND_SRC,
  PAGE_FLIP_SOUND_POOL_SIZE,
  PAGE_FLIP_SOUND_VOLUME,
} from '@/config/reader';

// Returns a stable `play` callback. On mount it allocates a fixed pool of
// Audio instances all pointing at the same URL — the browser downloads the
// file once and serves subsequent instances from cache. Round-robin selection
// means rapid flips overlap correctly instead of cutting each other off.
export function usePageFlipSound(): () => void {
  const poolRef = useRef<HTMLAudioElement[]>([]);
  const cursorRef = useRef(0);

  useEffect(() => {
    const pool: HTMLAudioElement[] = [];
    for (let i = 0; i < PAGE_FLIP_SOUND_POOL_SIZE; i++) {
      const audio = new Audio(PAGE_FLIP_SOUND_SRC);
      audio.preload = 'auto';
      audio.volume = PAGE_FLIP_SOUND_VOLUME;
      pool.push(audio);
    }
    poolRef.current = pool;
    cursorRef.current = 0;

    return () => {
      for (const audio of pool) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  return () => {
    const pool = poolRef.current;
    if (!pool.length) return;
    const audio = pool[cursorRef.current];
    cursorRef.current = (cursorRef.current + 1) % pool.length;
    audio.currentTime = 0;
    // Rejected until the user has interacted with the page — safe to ignore.
    audio.play().catch(() => {});
  };
}
