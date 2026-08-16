import { useEffect, useRef } from 'react';

interface QuizEmbedProps {
  embedCode: string;
  compact?: boolean;
}

// Injects the raw Fillout embed snippet (div attributes + external script) into
// the DOM via useEffect so the <script> actually executes — dangerouslySetInnerHTML
// skips script execution entirely. We rebuild each script node as a real
// HTMLScriptElement so the browser fetches and runs it.
export function QuizEmbed({ embedCode, compact = false }: QuizEmbedProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const match = /data-fillout-id="([^"]+)"/.exec(embedCode);
    const filloutId = match?.[1];

    container.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = filloutId
      ? `
        [data-fillout-id="${filloutId}"] {
          display: inline-block !important;
          width: 100% !important;
          max-width: 100% !important;
          font-size: inherit !important;
          line-height: 1.15 !important;
        }
        [data-fillout-id="${filloutId}"] *,
        [data-fillout-id="${filloutId}"] *::before,
        [data-fillout-id="${filloutId}"] *::after {
          font-size: inherit !important;
          line-height: 1.15 !important;
          letter-spacing: inherit !important;
        }
        [data-fillout-id="${filloutId}"] button,
        [data-fillout-id="${filloutId}"] a,
        [data-fillout-id="${filloutId}"] .fillout-button {
          white-space: nowrap !important;
          padding: ${compact ? '0.35em 0.7em' : '0.65em 1em'} !important;
          border-radius: 9999px !important;
          font-size: ${compact ? '0.7em' : '0.98em'} !important;
          line-height: 1.15 !important;
          min-height: unset !important;
          font-weight: ${compact ? '500' : '600'} !important;
        }
      `
      : '';
    if (style.textContent) container.appendChild(style);

    const tmp = document.createElement('div');
    tmp.innerHTML = embedCode;
    for (const node of Array.from(tmp.childNodes)) {
      if (node instanceof HTMLScriptElement) {
        const script = document.createElement('script');
        if (node.src) script.src = node.src;
        else script.textContent = node.textContent;
        container.appendChild(script);
      } else {
        container.appendChild(node.cloneNode(true));
      }
    }
  }, [compact, embedCode]);

  return <div ref={ref} style={{ display: 'inline-block', width: '100%' }} />;
}
