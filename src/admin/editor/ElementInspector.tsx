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

const TEXT_ALIGN_OPTIONS: TextAlign[] = ['right', 'left', 'center'];
const BACKGROUND_IMAGE_FIT_OPTIONS: BackgroundImageFit[] = ['cover', 'contain'];

const fieldLabelClassName = 'flex flex-col gap-1 text-sm';
const fieldInputClassName = 'rounded-md border border-input px-3 py-2';

interface ElementInspectorProps {
  element: PageElement | null;
  onUpdateTextProps: (id: string, changes: Partial<TextProps>) => void;
  onUpdateBackgroundImageProps: (id: string, changes: Partial<BackgroundImageProps>) => void;
}

// Styling controls for the currently selected element's `props` — the M9
// counterpart to EditorOverlay's geometry handles. Lives outside the canvas
// (plain Tailwind form controls, not the renderer) since it's admin chrome,
// not WYSIWYG content — see CLAUDE.md "UI component library — scope boundary".
export function ElementInspector({
  element,
  onUpdateTextProps,
  onUpdateBackgroundImageProps,
}: ElementInspectorProps) {
  const { data: fonts } = useFontsQuery();

  if (!element) {
    return (
      <aside className="w-72 shrink-0 rounded-md border border-input p-4">
        <p className="text-sm text-muted-foreground">Select an element to edit its style.</p>
      </aside>
    );
  }

  if (element.type === 'text') {
    const { props } = element;
    const update = (changes: Partial<TextProps>) => onUpdateTextProps(element.id, changes);

    return (
      <aside className="flex w-72 shrink-0 flex-col gap-4 rounded-md border border-input p-4">
        <h3 className="text-sm font-semibold">Text style</h3>

        <label className={fieldLabelClassName}>
          <span>Content</span>
          <textarea
            value={props.content}
            onChange={(event) => update({ content: event.target.value })}
            dir={props.direction === 'auto' ? undefined : props.direction}
            rows={4}
            className={`${fieldInputClassName} resize-y`}
          />
        </label>

        <label className={fieldLabelClassName}>
          <span>Font</span>
          <select
            value={props.font_id}
            onChange={(event) => update({ font_id: event.target.value })}
            className={fieldInputClassName}
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

        <label className={fieldLabelClassName}>
          <span>Font size</span>
          <input
            type="number"
            min={INSPECTOR_FONT_SIZE_MIN}
            max={INSPECTOR_FONT_SIZE_MAX}
            value={props.font_size}
            onChange={(event) => update({ font_size: Number(event.target.value) })}
            className={fieldInputClassName}
          />
        </label>

        <label className={fieldLabelClassName}>
          <span>Color</span>
          <input
            type="color"
            value={props.color}
            onChange={(event) => update({ color: event.target.value })}
            className={`${fieldInputClassName} h-10 p-1`}
          />
        </label>

        <label className={fieldLabelClassName}>
          <span>Alignment</span>
          <select
            value={props.align}
            onChange={(event) => update({ align: event.target.value as TextAlign })}
            className={fieldInputClassName}
          >
            {TEXT_ALIGN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldLabelClassName}>
          <span>Line height</span>
          <input
            type="number"
            min={INSPECTOR_LINE_HEIGHT_MIN}
            max={INSPECTOR_LINE_HEIGHT_MAX}
            step={INSPECTOR_LINE_HEIGHT_STEP}
            value={props.line_height}
            onChange={(event) => update({ line_height: Number(event.target.value) })}
            className={fieldInputClassName}
          />
        </label>
      </aside>
    );
  }

  const { props } = element;
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 rounded-md border border-input p-4">
      <h3 className="text-sm font-semibold">Background image style</h3>

      <label className={fieldLabelClassName}>
        <span>Fit</span>
        <select
          value={props.fit}
          onChange={(event) =>
            onUpdateBackgroundImageProps(element.id, {
              fit: event.target.value as BackgroundImageFit,
            })
          }
          className={fieldInputClassName}
        >
          {BACKGROUND_IMAGE_FIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
