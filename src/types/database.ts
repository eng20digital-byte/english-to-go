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
