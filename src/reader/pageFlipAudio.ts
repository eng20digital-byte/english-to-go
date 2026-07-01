// Cross-browser page-flip SFX engine.
//
// Why Web Audio instead of a pool of <audio> elements: the old HTMLAudio
// approach set `audio.currentTime = OFFSET` and called `play()` on every flip.
// On localhost the clip is always fully buffered, so that works. In production
// the file loads over the network, and seeking/playing before the element has
// buffered to the offset is ignored or throws `InvalidStateError` (and `play()`
// rejects) on some engines — which is exactly why the sound worked on some
// machines/browsers and not others. iOS Safari compounds this: it unlocks audio
// per media element, only on a `play()` fired synchronously inside a gesture,
// which the async seek can break.
//
// Web Audio sidesteps all of it: we fetch + decode the clip ONCE into an
// AudioBuffer (so playback never depends on element readyState or MIME
// sniffing), resume a single shared AudioContext on the first user gesture (one
// unlock covers every future sound, iOS included), and fire a disposable
// BufferSourceNode per flip (overlapping flips layer naturally instead of
// cutting each other off). Everything is module-level so decode + unlock happen
// once per tab and survive reader remounts.

import {
  PAGE_FLIP_SOUND_SRC,
  PAGE_FLIP_SOUND_POOL_SIZE,
  PAGE_FLIP_SOUND_VOLUME,
  PAGE_FLIP_SOUND_START_OFFSET_SEC,
} from '@/config/reader';

let audioContext: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let decodeStarted = false;
let listenersBound = false;
let unlocked = false;

// Lazy HTMLAudio pool — only built if Web Audio is unavailable (very old
// browsers). Kept as a graceful fallback rather than failing silently.
let fallbackPool: HTMLAudioElement[] | null = null;
let fallbackCursor = 0;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  if (typeof window === 'undefined') return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioContext = new Ctor();
  } catch {
    audioContext = null;
  }
  return audioContext;
}

// Fetch + decode the clip a single time. Safe to call repeatedly — guarded by
// `decodeStarted`. Failure leaves `buffer` null so play() degrades to fallback.
function ensureBuffer(ctx: AudioContext): void {
  if (buffer || decodeStarted) return;
  decodeStarted = true;
  fetch(PAGE_FLIP_SOUND_SRC)
    .then((res) => res.arrayBuffer())
    .then(
      (data) =>
        // decodeAudioData is promise-based in modern browsers, but Safari long
        // supported only the callback form — wrap to cover both.
        new Promise<AudioBuffer>((resolve, reject) => {
          const decoded = ctx.decodeAudioData(data, resolve, reject);
          // Modern implementations also return a promise; adopt it if present.
          if (decoded && typeof (decoded as Promise<AudioBuffer>).then === 'function') {
            (decoded as Promise<AudioBuffer>).then(resolve, reject);
          }
        }),
    )
    .then((decoded) => {
      buffer = decoded;
    })
    .catch(() => {
      // Allow a later retry (e.g. transient network error on first gesture).
      decodeStarted = false;
    });
}

// iOS/Safari only fully unlock the context when a sound actually starts inside a
// user gesture — resuming alone isn't always enough, so we also fire a silent
// 1-sample buffer. Idempotent: the silent prime runs only until unlocked.
function unlock(ctx: AudioContext): void {
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (unlocked) return;
  try {
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, 22050);
    silent.connect(ctx.destination);
    silent.start(0);
    unlocked = true;
  } catch {
    /* stays false; retried on the next gesture */
  }
}

function getFallbackPool(): HTMLAudioElement[] | null {
  if (fallbackPool) return fallbackPool;
  if (typeof Audio === 'undefined') return null;
  const pool: HTMLAudioElement[] = [];
  for (let i = 0; i < PAGE_FLIP_SOUND_POOL_SIZE; i++) {
    const audio = new Audio(PAGE_FLIP_SOUND_SRC);
    audio.preload = 'auto';
    audio.volume = PAGE_FLIP_SOUND_VOLUME;
    pool.push(audio);
  }
  fallbackPool = pool;
  return pool;
}

function playFallback(): void {
  const pool = getFallbackPool();
  if (!pool || !pool.length) return;
  const audio = pool[fallbackCursor];
  fallbackCursor = (fallbackCursor + 1) % pool.length;
  try {
    // Only seek once metadata exists — seeking too early is the exact bug that
    // broke the original implementation in production. If not ready yet, play
    // from the start (with the soft lead-in) rather than not at all.
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      audio.currentTime = PAGE_FLIP_SOUND_START_OFFSET_SEC;
    }
  } catch {
    /* ignore seek failure and just play */
  }
  audio.play().catch(() => {});
}

// Bind one-time global gesture listeners that unlock the context and kick off
// decoding as early as possible. Passive + idempotent.
export function initPageFlipAudio(): void {
  if (typeof window === 'undefined' || listenersBound) return;
  listenersBound = true;

  const onGesture = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    unlock(ctx);
    ensureBuffer(ctx);
  };

  const opts: AddEventListenerOptions = { passive: true };
  window.addEventListener('pointerdown', onGesture, opts);
  window.addEventListener('touchstart', onGesture, opts);
  window.addEventListener('keydown', onGesture, opts);
}

// Stable module-level reference (safe as a useCallback dependency). Called
// synchronously inside the flip's user-gesture handler, so the resume() here is
// itself gesture-driven — extra insurance on top of the global unlock.
export function playPageFlipSound(): void {
  const ctx = getAudioContext();
  if (ctx && buffer) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = PAGE_FLIP_SOUND_VOLUME;
      source.connect(gain).connect(ctx.destination);
      // `offset` skips the clip's soft lead-in so the "snap" lands in sync with
      // the animation — no readyState/seek race because the buffer is decoded.
      source.start(0, PAGE_FLIP_SOUND_START_OFFSET_SEC);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      return;
    } catch {
      // Fall through to the HTMLAudio path on any Web Audio failure.
    }
  }
  playFallback();
}
