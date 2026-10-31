// Renders the typed blocks of a guide section.
import type { Block, FigureItem, GuideContent } from '../../../i18n/guide/types.ts';
import { CodeBlock } from './CodeBlock.tsx';
import { Compare } from './Compare.tsx';
import { Diagram } from './Diagram.tsx';
import { Inline } from './Inline.tsx';
import { SameHeight } from './SameHeight.tsx';
import { IMAGE_SIZES } from './assets.ts';
import { assetUrl } from './url.ts';
import { domId } from './nav.ts';

const ACTION_HREF = { sprites: '#/sprites', ai: '#/ai', tiles: '#/tiles', kit: '#/kit' } as const;

function Figure({ item }: { item: FigureItem }) {
  const size = IMAGE_SIZES[item.src];
  const [w, h] = size ?? [undefined, undefined];
  const max = w ? Math.round(w * (item.zoom ?? 1)) : undefined;
  return (
    <figure
      className="g-figure"
      style={max ? { flexBasis: max, maxWidth: max } : undefined}
    >
      <img
        src={assetUrl(item.src)}
        alt={item.alt}
        width={w}
        height={h}
        loading="lazy"
        decoding="async"
        className={[item.pixelated ? 'is-pixel' : '', item.backdrop === 'checker' ? 'on-checker' : ''].filter(Boolean).join(' ') || undefined}
      />
      <figcaption>{item.caption}</figcaption>
    </figure>
  );
}

export function BlockView({ block, ui }: { block: Block; ui: GuideContent['ui'] }) {
  switch (block.type) {
    case 'p':
      return <p><Inline text={block.text} /></p>;
    case 'h3':
      return <h3 id={domId(block.id)}>{block.text}</h3>;
    case 'ul':
      return <ul className="g-list">{block.items.map((t, i) => <li key={i}><Inline text={t} /></li>)}</ul>;
    case 'steps':
      return <ol className="g-steps">{block.items.map((t, i) => <li key={i}><Inline text={t} /></li>)}</ol>;
    case 'callout':
      return (
        <aside className="g-callout">
          <strong>{block.title}</strong>
          <p><Inline text={block.text} /></p>
        </aside>
      );
    case 'code':
      return <CodeBlock title={block.title} lang={block.lang} code={block.code} copy={ui.copy} copied={ui.copied} />;
    case 'table':
      return (
        <div className="g-table">
          <table>
            <thead>
              <tr>{block.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (j === 0 ? <th key={j} scope="row"><Inline text={cell} /></th> : <td key={j}><Inline text={cell} /></td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'dl':
      return (
        <dl className="g-dl">
          {block.items.map((it) => (
            <div key={it.term}>
              <dt>{it.term}</dt>
              <dd><Inline text={it.text} /></dd>
            </div>
          ))}
        </dl>
      );
    case 'figures':
      return <div className="g-figures">{block.items.map((it) => <Figure key={it.src} item={it} />)}</div>;
    case 'example':
      return (
        <div className="g-example">
          <Figure item={block.item} />
          <div>
            <h4>{block.title}</h4>
            <ul className="g-list">{block.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        </div>
      );
    case 'diagram':
      return <Diagram steps={block.steps} legend={block.legend} />;
    case 'compare':
      return <Compare {...block} />;
    case 'sameHeight':
      return <SameHeight {...block} />;
    case 'actions':
      return (
        <div className="g-actions">
          {block.items.map((it) => <a key={it.to} className="g-btn" href={ACTION_HREF[it.to]}>{it.label}</a>)}
        </div>
      );
  }
}
