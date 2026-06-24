import { MousePointer2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useFontsQuery } from '@/hooks/useFontsQuery';
import {
  INSPECTOR_FONT_SIZE_MIN,
  INSPECTOR_FONT_SIZE_MAX,
  INSPECTOR_LINE_HEIGHT_MIN,
  INSPECTOR_LINE_HEIGHT_MAX,
  INSPECTOR_LINE_HEIGHT_STEP,
} from '@/config/editor';
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

const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block';
const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

interface ElementInspectorProps {
  element: PageElement | null;
  onUpdateTextProps: (id: string, changes: Partial<TextProps>) => void;
  onUpdateBackgroundImageProps: (id: string, changes: Partial<BackgroundImageProps>) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
        {title}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

// Styling controls for the currently selected element's `props` — the M9
// counterpart to EditorOverlay's geometry handles. Lives outside the canvas
// (plain form controls, not the renderer) since it's admin chrome,
// not WYSIWYG content — see CLAUDE.md "UI component library — scope boundary".
export function ElementInspector({
  element,
  onUpdateTextProps,
  onUpdateBackgroundImageProps,
}: ElementInspectorProps) {
  const { data: fonts } = useFontsQuery();

  if (!element) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <MousePointer2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Click an element to edit its style and position.
        </p>
      </div>
    );
  }

  if (element.type === 'text') {
    const { props } = element;
    const update = (changes: Partial<TextProps>) => onUpdateTextProps(element.id, changes);

    return (
      <div className="h-full overflow-y-auto">
        <Section title="Content">
          <textarea
            value={props.content}
            onChange={(event) => update({ content: event.target.value })}
            dir={props.direction === 'auto' ? undefined : props.direction}
            rows={4}
            className={`${inputCls} resize-y`}
          />
        </Section>

        <Separator />

        <Section title="Typography">
          <label className="block">
            <span className={labelCls}>Font</span>
            <select
              value={props.font_id}
              onChange={(event) => update({ font_id: event.target.value })}
              className={inputCls}
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

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={labelCls}>Size (px)</span>
              <input
                type="number"
                min={INSPECTOR_FONT_SIZE_MIN}
                max={INSPECTOR_FONT_SIZE_MAX}
                value={props.font_size}
                onChange={(event) => update({ font_size: Number(event.target.value) })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Line height</span>
              <input
                type="number"
                min={INSPECTOR_LINE_HEIGHT_MIN}
                max={INSPECTOR_LINE_HEIGHT_MAX}
                step={INSPECTOR_LINE_HEIGHT_STEP}
                value={props.line_height}
                onChange={(event) => update({ line_height: Number(event.target.value) })}
                className={inputCls}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={props.color}
                onChange={(event) => update({ color: event.target.value })}
                className="h-9 w-14 cursor-pointer rounded-lg border border-input p-1"
              />
              <input
                type="text"
                value={props.color}
                onChange={(event) => update({ color: event.target.value })}
                className={`${inputCls} flex-1`}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={labelCls}>Align</span>
              <select
                value={props.align}
                onChange={(event) => update({ align: event.target.value as TextAlign })}
                className={inputCls}
              >
                {TEXT_ALIGN_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Direction</span>
              <select
                value={props.direction}
                onChange={(event) =>
                  update({ direction: event.target.value as TextProps['direction'] })
                }
                className={inputCls}
              >
                <option value="rtl">RTL</option>
                <option value="ltr">LTR</option>
                <option value="auto">Auto</option>
              </select>
            </label>
          </div>
        </Section>

        <Separator />

        <Section title="Position">
          <div className="grid grid-cols-2 gap-2">
            {(['x', 'y', 'w', 'h'] as const).map((key) => (
              <label key={key} className="block">
                <span className={labelCls}>{key.toUpperCase()}</span>
                <input
                  type="number"
                  value={Math.round(element[key])}
                  readOnly
                  className={`${inputCls} bg-muted text-muted-foreground`}
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
    <div className="h-full overflow-y-auto">
      <Section title="Image">
        <label className="block">
          <span className={labelCls}>Fit</span>
          <select
            value={props.fit}
            onChange={(event) =>
              onUpdateBackgroundImageProps(element.id, {
                fit: event.target.value as BackgroundImageFit,
              })
            }
            className={inputCls}
          >
            {BACKGROUND_IMAGE_FIT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Separator />

      <Section title="Position">
        <div className="grid grid-cols-2 gap-2">
          {(['x', 'y', 'w', 'h'] as const).map((key) => (
            <label key={key} className="block">
              <span className={labelCls}>{key.toUpperCase()}</span>
              <input
                type="number"
                value={Math.round(element[key])}
                readOnly
                className={`${inputCls} bg-muted text-muted-foreground`}
              />
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
