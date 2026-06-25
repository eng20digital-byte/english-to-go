import type { CSSProperties } from 'react';
import { MousePointer2, Plus, Trash2 } from 'lucide-react';
import { useFontsQuery } from '@/hooks/useFontsQuery';
import type { FontRow } from '@/types/database';
import {
  INSPECTOR_FONT_SIZE_MIN,
  INSPECTOR_FONT_SIZE_MAX,
  INSPECTOR_LINE_HEIGHT_MIN,
  INSPECTOR_LINE_HEIGHT_MAX,
  INSPECTOR_LINE_HEIGHT_STEP,
} from '@/config/editor';
import {
  VOCABULARY_BORDER_WIDTH_MAX,
  VOCABULARY_BORDER_RADIUS_MAX,
  VOCABULARY_PADDING_MAX,
  VOCABULARY_SPACING_MAX,
} from '@/config/vocabulary';
import { BRAND } from '@/config/theme';
import type {
  PageElement,
  TextProps,
  BackgroundImageProps,
  VocabularyProps,
  VocabularyWord,
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
  onUpdateVocabularyProps: (id: string, changes: Partial<VocabularyProps>) => void;
}

// Font picker reused by the text and vocabulary panels — keeps the
// "(unknown font)" fallback option logic in one place.
function FontSelect({
  value,
  fonts,
  onChange,
}: {
  value: string;
  fonts: FontRow[] | undefined;
  onChange: (fontId: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="ei-input">
      {!fonts?.some((font) => font.id === value) && <option value={value}>(unknown font)</option>}
      {fonts?.map((font) => (
        <option key={font.id} value={font.id}>
          {font.name} — {font.weight}
        </option>
      ))}
    </select>
  );
}

// Labeled color swatch + hex input pair, reused across panels.
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={LABEL_STYLE}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="ei-color" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ei-input"
          style={{ flex: 1 }}
        />
      </div>
    </label>
  );
}

// Labeled numeric input, reused by the vocabulary bubble-style controls.
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={LABEL_STYLE}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ei-input"
      />
    </label>
  );
}

// Shared read-only X/Y/W/H block — geometry is driven by drag/resize on the
// canvas, shown here for reference only (same for every element type).
function PositionSection({ element }: { element: PageElement }) {
  return (
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
  );
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
  onUpdateVocabularyProps,
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
            <FontSelect
              value={props.font_id}
              fonts={fonts}
              onChange={(fontId) => update({ font_id: fontId })}
            />
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

          <ColorField label="Color" value={props.color} onChange={(color) => update({ color })} />

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

        <PositionSection element={element} />
      </div>
    );
  }

  if (element.type === 'vocabulary') {
    const { props } = element;
    const update = (changes: Partial<VocabularyProps>) =>
      onUpdateVocabularyProps(element.id, changes);

    const updateWord = (index: number, changes: Partial<VocabularyWord>) => {
      const words = props.words.map((word, i) => (i === index ? { ...word, ...changes } : word));
      update({ words });
    };
    const addWord = () => update({ words: [...props.words, { english: '', hebrew: '' }] });
    const removeWord = (index: number) =>
      update({ words: props.words.filter((_, i) => i !== index) });

    return (
      <div style={{
        height: '100%', overflowY: 'auto',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}>
        <Section title="Words">
          {props.words.map((word, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                value={word.english}
                placeholder="English"
                dir="ltr"
                onChange={(e) => updateWord(index, { english: e.target.value })}
                className="ei-input"
                style={{ flex: 1, minWidth: 0 }}
              />
              <span style={{ color: BRAND.textMuted, flexShrink: 0 }}>-</span>
              <input
                type="text"
                value={word.hebrew}
                placeholder="עברית"
                dir="rtl"
                onChange={(e) => updateWord(index, { hebrew: e.target.value })}
                className="ei-input"
                style={{ flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={() => removeWord(index)}
                title="Remove row"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, flexShrink: 0,
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: 'transparent', color: BRAND.pink,
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addWord}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 10px', marginTop: 2,
              border: `1px dashed rgba(0,0,0,0.18)`, borderRadius: 10,
              background: 'transparent', color: BRAND.text, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            }}
          >
            <Plus size={14} /> Add row
          </button>
        </Section>

        <Section title="Display">
          {/* Hide the bubbles on the page without deleting the words — they
              still appear in the reader's vocabulary panel. Default (missing
              value) is shown. */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={props.show_on_page !== false}
              onChange={(e) => update({ show_on_page: e.target.checked })}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: BRAND.text }}>
              Show bubbles on page
            </span>
          </label>
          <p style={{ margin: 0, fontSize: 11, color: BRAND.textMuted, lineHeight: 1.4 }}>
            When off, the words stay in the reader's vocabulary panel but don't
            appear on the page itself.
          </p>
        </Section>

        <Section title="Typography">
          <label style={{ display: 'block' }}>
            <span style={LABEL_STYLE}>English font</span>
            <FontSelect
              value={props.english_font_id}
              fonts={fonts}
              onChange={(fontId) => update({ english_font_id: fontId })}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={LABEL_STYLE}>Hebrew font</span>
            <FontSelect
              value={props.hebrew_font_id}
              fonts={fonts}
              onChange={(fontId) => update({ hebrew_font_id: fontId })}
            />
          </label>
          <NumberField
            label="Font size (px)"
            value={props.font_size}
            min={INSPECTOR_FONT_SIZE_MIN}
            max={INSPECTOR_FONT_SIZE_MAX}
            onChange={(font_size) => update({ font_size })}
          />
          <ColorField
            label="Text color"
            value={props.text_color}
            onChange={(text_color) => update({ text_color })}
          />
        </Section>

        <Section title="Bubble">
          <ColorField
            label="Background"
            value={props.bubble_background_color}
            onChange={(bubble_background_color) => update({ bubble_background_color })}
          />
          <ColorField
            label="Border color"
            value={props.bubble_border_color}
            onChange={(bubble_border_color) => update({ bubble_border_color })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberField
              label="Border width"
              value={props.bubble_border_width}
              min={0}
              max={VOCABULARY_BORDER_WIDTH_MAX}
              onChange={(bubble_border_width) => update({ bubble_border_width })}
            />
            <NumberField
              label="Corner radius"
              value={props.bubble_border_radius}
              min={0}
              max={VOCABULARY_BORDER_RADIUS_MAX}
              onChange={(bubble_border_radius) => update({ bubble_border_radius })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberField
              label="Padding X"
              value={props.bubble_padding_x}
              min={0}
              max={VOCABULARY_PADDING_MAX}
              onChange={(bubble_padding_x) => update({ bubble_padding_x })}
            />
            <NumberField
              label="Padding Y"
              value={props.bubble_padding_y}
              min={0}
              max={VOCABULARY_PADDING_MAX}
              onChange={(bubble_padding_y) => update({ bubble_padding_y })}
            />
          </div>
          <NumberField
            label="Spacing between bubbles"
            value={props.bubble_spacing}
            min={0}
            max={VOCABULARY_SPACING_MAX}
            onChange={(bubble_spacing) => update({ bubble_spacing })}
          />
        </Section>

        <PositionSection element={element} />
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

      <PositionSection element={element} />
    </div>
  );
}
