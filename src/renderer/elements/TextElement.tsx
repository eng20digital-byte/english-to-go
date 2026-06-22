import { useFontsQuery } from '@/hooks/useFontsQuery';
import { useFontFace } from '@/hooks/useFontFace';
import type { PageElement } from '@/types/elements';
import type { ElementRendererProps } from './registry';

type Props = ElementRendererProps<Extract<PageElement, { type: 'text' }>>;

// Splits `content` into words at render time (not pre-tokenized in the DB —
// see CLAUDE.md "TTS (word-click)"), so editor and reader share one source
// of truth for word boundaries. Whitespace runs are kept as plain text
// between spans so wrapping/spacing behave naturally under
// `white-space: pre-wrap`. Word spans render in both modes; only the reader
// wires clicks to speech (M10) — editor mode keeps the whole box as the
// drag/select target.
export function TextElement({ element }: Props) {
  const { content, font_id, font_size, color, align, line_height, direction } = element.props;

  const { data: fonts } = useFontsQuery();
  const font = fonts?.find((f) => f.id === font_id);
  const familyName = `font-${font_id}`;
  const fontStatus = useFontFace(font?.storage_path, familyName);

  const tokens = content.split(/(\s+)/);
  let wordIndex = 0;

  return (
    <div
      dir={direction}
      style={{
        width: '100%',
        height: '100%',
        fontFamily: fontStatus === 'loaded' ? familyName : undefined,
        fontSize: font_size,
        color,
        textAlign: align,
        lineHeight: line_height,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
      }}
    >
      {tokens.map((token, index) =>
        /^\s+$/.test(token) ? (
          token
        ) : (
          <span key={index} data-word-index={wordIndex++}>
            {token}
          </span>
        ),
      )}
    </div>
  );
}
