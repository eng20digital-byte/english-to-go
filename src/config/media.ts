import { CANVAS_WIDTH } from '@/config/canvas';

// Media Storage bucket config — mirrors config/fonts.ts conventions.
export const MEDIA_STORAGE_BUCKET = 'media';
export const MEDIA_ACCEPTED_FILE_TYPES = 'image/*';

// Client-side upload compression (M6 scope addition) — keeps Storage usage
// within Supabase free-tier limits, see CLAUDE.md deployment notes. Max
// dimension matches the canvas width since images never need to be sharper
// than the canvas can display them at.
export const MEDIA_MAX_DIMENSION = CANVAS_WIDTH;
export const MEDIA_COMPRESS_QUALITY = 0.8;
export const MEDIA_OUTPUT_MIME_TYPE = 'image/webp';
export const MEDIA_OUTPUT_FILE_EXTENSION = '.webp';
