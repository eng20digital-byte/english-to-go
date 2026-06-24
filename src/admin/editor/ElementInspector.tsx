import type { CSSProperties } from 'react';
import { MousePointer2 } from 'lucide-react';
import { useFontsQuery } from '@/hooks/useFontsQuery';
import {
  INSPECTOR_FONT_SIZE_MIN,
  INSPECTOR_FONT_SIZE_MAX,
  INSPECTOR_LINE_HEIGHT_MIN,
  INSPECTOR_LINE_HEIGHT_MAX,
  INSPECTOR_LINE_HEIGHT_STEP,
} from '@/config/editor';
import { BRAND } from '@/config/theme';
import type {
  PageElement,
  TextProps,
  BackgroundImageProps,
  TextAlign,
  BackgroundImageFit,
} from '@/types/elements';

const TEXT_ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
];

const BACKGROUND_IMAGE_FIT_OPTIONS: { value: BackgroundImageFit; label: string }[] = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
];

const LABEL_STYLE: CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: BRAND.textMuted,
  marginBottom: 5,
};

interface ElementInspectorProps {
  element: PageElement | null;
  onUpdateTextProps: (id: string, changes: Partial<TextProps>) => void;
  onUpdateBackgroundImageProps: (id: string, changes: Partial<BackgroundImageProps>) => void;
}

// Section card inside the inspector panel. Each section has a title label and
// groups related controls. Border-bottom separates sections visually.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
    }}>
      <p style={{
        margin: '0 0 12px',
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: BRAND.textMuted,
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

// Styling controls for the currently selected element's `props` — the M9
// counterpart to EditorOverlay's geometry handles. Lives outside the canvas
// (plain form controls, not the renderer) since it's admin chrome,
// not WYSIWYG content — see CLAUDE.md "UI component library — scope boundary".
//
// CSS classes `ei-input`, `ei-input-readonly`, `ei-color` are defined in
// index.css (scoped to #admin-root) so that :focus pseudo-state styling works
// without React useState tracking on every individual input.
export function ElementInspector({
  element,
  onUpdateTextProps,
  onUpdateBackgroundImageProps,
}: ElementInspectorProps) {
  const { data: fonts } = useFontsQuery();

  if (!element) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, height: '100%', padding: '0 24px', textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          backgroundColor: 'rgba(89,178,146,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MousePointer2 size={20} color={BRAND.green} />
        </div>
        <p style={{ margin: 0, fontSize: 13, color: BRAND.textMuted, lineHeight: 1.5 }}>
          Click an element to edit its style and position.
        </p>
      </div>
    );
  }

  if (element.type === 'text') {
    const { props } = element;
    const update = (changes: Partial<TextProps>) => onUpdateTextProps(element.id, changes);

    return (
      <div style={{
        height: '100%', overflowY: 'auto',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}>
        <Section title="Content">
          <textarea
            value={props.content}
            onChange={(event) => update({ content: event.target.value })}
            dir={props.direction === 'auto' ? undefined : props.direction}
            rows={4}
            className="ei-input"
            style={{ resize: 'vertical' }}
          />
        </Section>

        <Section title="Typography">
          <label style={{ display: 'block' }}>
            <span style={LABEL_STYLE}>Font</span>
            <select
              value={props.font_id}
              onChange={(event) => update({ font_id: event.target.value })}
              className="ei-input"
            >
              {!fonts?.some((font) => font.id === props.font_id) && (
                <option value={props.font_id}>(unknown font)</option>
              )}
              {fonts?.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.name} — {font.weight}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'block' }}>
              <span style={LABEL_STYLE}>Size (px)</span>
              <input
                type="number"
                min={INSPECTOR_FONT_SIZE_MIN}
                max={INSPECTOR_FONT_SIZE_MAX}
                value={props.font_size}
                onChange={(event) => update({ font_size: Number(event.target.value) })}
                className="ei-input"
              />
            </label>
            <label style={{ display: 'block' }}>
              <span style={LABEL_STYLE}>Line height</span>
              <input
                type="number"
                min={INSPECTOR_LINE_HEIGHT_MIN}
                max={INSPECTOR_LINE_HEIGHT_MAX}
                step={INSPECTOR_LINE_HEIGHT_STEP}
                value={props.line_height}
                onChange={(event) => update({ line_height: Number(event.target.value) })}
                className="ei-input"
              />
            </label>
          </div>

          <label style={{ display: 'block' }}>
            <span style={LABEL_STYLE}>Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={props.color}
                onChange={(event) => update({ color: event.target.value })}
                className="ei-color"
              />
              <input
                type="text"
                value={props.color}
                onChange={(event) => update({ color: event.target.value })}
                className="ei-input"
                style={{ flex: 1 }}
              />
            </div>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'block' }}>
              <span style={LABEL_STYLE}>Align</span>
              <select
                value={props.align}
                onChange={(event) => update({ align: event.target.value as TextAlign })}
                className="ei-input"
              >
                {TEXT_ALIGN_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'block' }}>
              <span style={LABEL_STYLE}>Direction</span>
              <select
                value={props.direction}
                onChange={(event) =>
                  update({ direction: event.target.value as TextProps['direction'] })
                }
                className="ei-input"
              >
                <option value="rtl">RTL</option>
                <option value="ltr">LTR</option>
                <option value="auto">Auto</option>
              </select>
            </label>
          </div>
        </Section>

        <Section title="Position">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['x', 'y', 'w', 'h'] as const).map((key) => (
              <label key={key} style={{ display: 'block' }}>
                <span style={LABEL_STYLE}>{key.toUpperCase()}</span>
                <input
                  type="number"
                  value={Math.round(element[key])}
                  readOnly
                  className="ei-input ei-input-readonly"
                />
              </label>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  // background_image element
  const { props } = element;
  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      <Section title="Image">
        <label style={{ display: 'block' }}>
          <span style={LABEL_STYLE}>Fit</span>
          <select
            value={props.fit}
            onChange={(event) =>
              onUpdateBackgroundImageProps(element.id, {
                fit: event.target.value as BackgroundImageFit,
              })
            }
            className="ei-input"
          >
            {BACKGROUND_IMAGE_FIT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Position">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['x', 'y', 'w', 'h'] as const).map((key) => (
            <label key={key} style={{ display: 'block' }}>
              <span style={LABEL_STYLE}>{key.toUpperCase()}</span>
              <input
                type="number"
                value={Math.round(element[key])}
                readOnly
                className="ei-input ei-input-readonly"
              />
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
