// Supabase row types — hand-written to match supabase/migrations/0001_init.sql.
// Extend per-table as each milestone starts reading/writing it.
import type { FontWeight } from '@/config/fonts';

export interface FontRow {
  id: string;
  name: string;
  weight: FontWeight;
  storage_path: string;
  created_at: string;
}

export interface MediaAssetRow {
  id: string;
  storage_path: string;
  file_name: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

export type BookletStatus = 'draft' | 'published' | 'disabled';

export interface BookletRow {
  id: string;
  public_token: string;
  title: string;
  status: BookletStatus;
  canvas_width: number;
  canvas_height: number;
  background_color: string; // page-canvas background, hex #rrggbb (migration 0005)
  quiz_embed_code: string | null;
  quiz_embed_height: number | null;
  show_quiz_on_last_spread: boolean; // booklet-level flag (migration 0008)
  created_at: string;
  updated_at: string;
}

export interface PageRow {
  id: string;
  booklet_id: string;
  page_order: number;
  is_quiz_page: boolean;
  is_cover: boolean;
  is_back_cover: boolean;
  created_at: string;
}

// Per-recipient publication (migration 0009). Each booklet can hand out many
// independent links, one per named recipient, each published/unpublished on its
// own schedule (manual toggle or timed expiry) — separate from the admin's
// master link (booklets.status + public_token). Used from RP2 on; defined here
// so the DB shape lives in one place.
export type RecipientStatus = 'published' | 'unpublished';

export interface BookletRecipientRow {
  id: string;
  booklet_id: string;
  name: string;
  access_token: string;
  status: RecipientStatus;
  expires_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
