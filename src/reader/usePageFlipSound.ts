import { useEffect } from 'react';
import { initPageFlipAudio, playPageFlipSound } from './pageFlipAudio';

// Thin hook over the module-level Web Audio engine (see pageFlipAudio.ts). On
// mount it binds the one-time global gesture listeners that unlock the shared
// AudioContext and pre-decode the clip; it returns the stable `playPageFlipSound`
// reference (safe as a useCallback dependency in PageFlip). All real state lives
// in the module, so decode + unlock happen once per tab and survive remounts.
export function usePageFlipSound(): () => void {
  useEffect(() => {
    initPageFlipAudio();
  }, []);

  return playPageFlipSound;
}
