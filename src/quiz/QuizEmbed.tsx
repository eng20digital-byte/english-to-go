import { useEffect, useRef } from 'react';

interface QuizEmbedProps {
  embedCode: string;
}

// Injects the raw Fillout embed snippet (div attributes + external script) into
// the DOM via useEffect so the <script> actually executes — dangerouslySetInnerHTML
// skips script execution entirely. We rebuild each script node as a real
// HTMLScriptElement so the browser fetches and runs it.
export function QuizEmbed({ embedCode }: QuizEmbedProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = '';
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
  }, [embedCode]);

  return <div ref={ref} />;
}
