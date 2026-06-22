import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useFontsQuery } from '@/hooks/useFontsQuery';
import { useCanvasScale } from '@/renderer/useCanvasScale';
import { PageCanvas, type PageCanvasPage } from '@/renderer/PageCanvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DEFAULT_LINE_HEIGHT } from '@/config/canvas';
import type { BackgroundImageFit } from '@/types/elements';

// M4 manual-verification harness — proves PageCanvas against hardcoded mock
// data before the editor or reader depend on it. Throwaway: delete once M5
// (public reader) gives a real, DB-backed way to view a rendered page.
// Still touches Supabase for fonts/media lookups (the renderer's element
// components do that for real, by design — see TextElement/
// BackgroundImageElement) but no booklets/pages/page_elements rows are
// involved; the page+elements array below is hand-written.

const PREVIEW_WIDTHS = [
  { label: 'Desktop', maxWidth: 900 },
  { label: 'Tablet', maxWidth: 540 },
  { label: 'Mobile', maxWidth: 320 },
] as const;

function useFirstMediaAssetId() {
  return useQuery({
    queryKey: ['dev-canvas-preview-media-asset'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.from('media_assets').select('id').limit(1);
      if (error) throw error;
      return data[0]?.id ?? null;
    },
  });
}

function buildMockPage(mediaAssetId: string | null, fontId: string, fit: BackgroundImageFit): PageCanvasPage {
  return {
    id: 'mock-page',
    elements: [
      ...(mediaAssetId
        ? ([
            {
              id: `mock-bg-${fit}`,
              page_id: 'mock-page',
              type: 'background_image',
              z_index: 0,
              x: 0,
              y: 0,
              w: CANVAS_WIDTH,
              h: CANVAS_HEIGHT,
              rotation: 0,
              props: { media_asset_id: mediaAssetId, fit },
            },
          ] as const)
        : []),
      {
        id: 'mock-text-he',
        page_id: 'mock-page',
        type: 'text',
        z_index: 1,
        x: 80,
        y: 120,
        w: 920,
        h: 280,
        rotation: 0,
        props: {
          content: 'שלום וברוכים הבאים לחוברת הדיגיטלית שלנו!',
          font_id: fontId,
          font_size: 56,
          color: '#1a1a1a',
          align: 'right',
          line_height: DEFAULT_LINE_HEIGHT,
          direction: 'rtl',
        },
      },
      {
        id: 'mock-text-en',
        page_id: 'mock-page',
        type: 'text',
        z_index: 1,
        x: 80,
        y: 480,
        w: 920,
        h: 280,
        rotation: 0,
        props: {
          content: 'Welcome to our digital booklet platform!',
          font_id: fontId,
          font_size: 48,
          color: '#1a1a1a',
          align: 'left',
          line_height: DEFAULT_LINE_HEIGHT,
          direction: 'ltr',
        },
      },
      {
        id: 'mock-text-mixed',
        page_id: 'mock-page',
        type: 'text',
        z_index: 1,
        x: 80,
        y: 840,
        w: 920,
        h: 360,
        rotation: 15,
        props: {
          content: 'זהו משפט מעורב with English words בתוכו, לבדיקת bidi.',
          font_id: fontId,
          font_size: 44,
          color: '#1a1a1a',
          align: 'right',
          line_height: DEFAULT_LINE_HEIGHT,
          direction: 'auto',
        },
      },
    ],
  };
}

function ScaledCanvas({ page, maxWidth }: { page: PageCanvasPage; maxWidth: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useCanvasScale(containerRef);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth,
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        overflow: 'hidden',
        border: '1px solid #ccc',
      }}
    >
      <PageCanvas page={page} scale={scale} renderMode="reader" />
    </div>
  );
}

export function CanvasPreviewPage() {
  const [widthPreset, setWidthPreset] = useState<(typeof PREVIEW_WIDTHS)[number]>(PREVIEW_WIDTHS[0]);
  const { data: fonts } = useFontsQuery();
  const { data: mediaAssetId } = useFirstMediaAssetId();

  const fontId = fonts?.find((font) => font.weight === 'regular')?.id ?? fonts?.[0]?.id;

  if (!fonts) return <p style={{ padding: 16 }}>Loading…</p>;
  if (!fontId) {
    return <p style={{ padding: 16 }}>Register a font in Font Manager first (/admin/fonts).</p>;
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h1>PageCanvas preview (M4 harness)</h1>

      <p>
        Live-resize the browser window to test <code>useCanvasScale</code>, or pick a preset below to
        simulate a breakpoint.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {PREVIEW_WIDTHS.map((preset) => (
          <button key={preset.label} onClick={() => setWidthPreset(preset)}>
            {preset.label} ({preset.maxWidth}px)
          </button>
        ))}
      </div>
      <ScaledCanvas page={buildMockPage(mediaAssetId ?? null, fontId, 'cover')} maxWidth={widthPreset.maxWidth} />

      {mediaAssetId === null && (
        <p style={{ color: '#a00' }}>
          No media_assets row found — upload an image to the `media` Storage bucket and insert one
          media_assets row to test background image cover/contain.
        </p>
      )}

      {mediaAssetId && (
        <>
          <h2>Background image fit comparison</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <p>cover</p>
              <ScaledCanvas page={buildMockPage(mediaAssetId, fontId, 'cover')} maxWidth={320} />
            </div>
            <div>
              <p>contain</p>
              <ScaledCanvas page={buildMockPage(mediaAssetId, fontId, 'contain')} maxWidth={320} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
