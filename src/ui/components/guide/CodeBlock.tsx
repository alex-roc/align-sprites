// Code sample with a copy button. Full-line and trailing comments are dimmed (no highlighter dependency).
import { useEffect, useRef, useState } from 'react';

const MARKER = { gdscript: '#', js: '//' } as const;

/** Index of the first comment marker that is not inside a string, or -1. */
function commentStart(line: string, marker: string): number {
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (line.startsWith(marker, i)) return i;
  }
  return -1;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function CodeBlock(p: { title: string; lang: 'gdscript' | 'js'; code: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    if (!(await copyText(p.code))) return;
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1800);
  };

  const marker = MARKER[p.lang];
  const lines = p.code.replace(/\n$/, '').split('\n');
  return (
    <figure className="g-code">
      <figcaption className="g-code-bar">
        <span className="g-code-title">{p.title}</span>
        <button type="button" className="g-code-copy" onClick={onCopy}>
          {done ? p.copied : p.copy}
        </button>
        <span className="sr-only" role="status" aria-live="polite">{done ? p.copied : ''}</span>
      </figcaption>
      <pre tabIndex={0}>
        <code>
          {lines.map((line, i) => {
            const at = commentStart(line, marker);
            return (
              <span key={i} className="g-code-line">
                {at < 0 ? line : <>{line.slice(0, at)}<span className="g-code-comment">{line.slice(at)}</span></>}
                {'\n'}
              </span>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
