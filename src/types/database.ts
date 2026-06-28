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
  quiz_embed_code: string | null;
  quiz_embed_height: number | null;
  created_at: string;
  updated_at: string;
}

export interface PageRow {
  id: string;
  booklet_id: string;
  page_order: number;
  is_quiz_page: boolean;
  is_cover: boolean;
  created_at: string;
}
