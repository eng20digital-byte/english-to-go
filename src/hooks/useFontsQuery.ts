import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { FONT_FILE_EXTENSION, FONTS_STORAGE_BUCKET, type FontWeight } from '@/config/fonts';
import type { FontRow } from '@/types/database';

const FONTS_QUERY_KEY = ['fonts'] as const;

export function useFontsQuery() {
  return useQuery({
    queryKey: FONTS_QUERY_KEY,
    queryFn: async (): Promise<FontRow[]> => {
      const { data, error } = await supabase
        .from('fonts')
        .select('id, name, weight, storage_path, created_at')
        .order('name')
        .order('weight');
      if (error) throw error;
      return data;
    },
  });
}

interface RegisterFontInput {
  name: string;
  weight: FontWeight;
  file: File;
}

async function registerFont({ name, weight, file }: RegisterFontInput): Promise<void> {
  const storagePath = `${FONTS_STORAGE_BUCKET}/${slugify(`${name}-${weight}`)}${FONT_FILE_EXTENSION}`;

  const { error: uploadError } = await supabase.storage
    .from(FONTS_STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: 'font/woff2' });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase
    .from('fonts')
    .insert({ name, weight, storage_path: storagePath });
  if (insertError) {
    // Storage and the DB aren't transactional together — without this, a
    // failed insert (e.g. the unique(name, weight) constraint) would leave
    // an orphaned file behind with no row pointing at it.
    await supabase.storage.from(FONTS_STORAGE_BUCKET).remove([storagePath]);
    throw insertError;
  }
}

export function useRegisterFontMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerFont,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FONTS_QUERY_KEY });
    },
  });
}
