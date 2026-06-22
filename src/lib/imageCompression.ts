import {
  MEDIA_MAX_DIMENSION,
  MEDIA_COMPRESS_QUALITY,
  MEDIA_OUTPUT_MIME_TYPE,
} from '@/config/media';

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

// Resizes to fit within MEDIA_MAX_DIMENSION and re-encodes at
// MEDIA_COMPRESS_QUALITY before upload — see config/media.ts for why.
export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MEDIA_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, MEDIA_OUTPUT_MIME_TYPE, MEDIA_COMPRESS_QUALITY),
  );
  if (!blob) throw new Error('Image compression failed');

  return { blob, width, height };
}
