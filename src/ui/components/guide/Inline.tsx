// Inline markup of guide strings: `code`, **bold**, [label](href). Links to `#/guide/<id>` scroll inside the guide.
import type { ReactNode } from 'react';
import { goTo, guideIdOf } from './nav.ts';

const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

function link(label: string, href: string, key: number): ReactNode {
  const id = guideIdOf(href);
  if (id) {
    return (
      <a key={key} href={href} onClick={(e) => { e.preventDefault(); goTo(id); }}>
        {label}
      </a>
    );
  }
  const external = /^https?:/.test(href);
  return (
    <a key={key} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {label}
    </a>
  );
}

export function Inline({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (m) return link(m[1]!, m[2]!, i);
        return part;
      })}
    </>
  );
}
