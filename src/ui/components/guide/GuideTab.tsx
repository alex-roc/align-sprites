// In-site guide (en/es). `section` is the anchor from the hash route (#/guide/<section>): a section id or a
// subsection (h3) id; undefined means the top. The shell only mounts this component.
import { useEffect, useMemo } from 'react';
import { guideEn } from '../../../i18n/guide/en.ts';
import { guideEs } from '../../../i18n/guide/es.ts';
import type { GuideContent } from '../../../i18n/guide/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { BlockView } from './Blocks.tsx';
import { Inline } from './Inline.tsx';
import { consumeHandled, domId, goTo, scrollToId, useActiveSection } from './nav.ts';
import './guide.css';

const CONTENT: Record<string, GuideContent> = { en: guideEn, es: guideEs };

export function GuideTab({ section }: { section?: string }) {
  const { lang } = useI18n();
  const content = CONTENT[lang] ?? guideEn;
  const ids = useMemo(() => content.sections.map((s) => s.id), [content]);
  // subsection (h3) id → the section that holds it, so a deep link highlights the right index entry
  const parentOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of content.sections) {
      m.set(s.id, s.id);
      for (const b of s.blocks) if (b.type === 'h3') m.set(b.id, s.id);
    }
    return m;
  }, [content]);
  const [active, setActive] = useActiveSection(ids);

  // Arriving with an anchor (or the anchor changing): scroll there. The first jump is instant.
  useEffect(() => {
    if (!section) return;
    const parent = parentOf.get(section);
    if (!parent) return;
    setActive(parent);
    if (consumeHandled(section)) return;
    // wait a frame so the layout (and the language switch) has settled
    const raf = requestAnimationFrame(() => scrollToId(section, false));
    return () => cancelAnimationFrame(raf);
  }, [section, parentOf, setActive]);

  return (
    <div className="guide">
      <div className="guide-index">
        <nav aria-label={content.ui.indexLabel} className="guide-index-list">
          <ol>
            {content.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#/guide/${s.id}`}
                  aria-current={active === s.id ? 'location' : undefined}
                  onClick={(e) => { e.preventDefault(); setActive(s.id); goTo(s.id); }}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <select
          className="guide-index-select"
          aria-label={content.ui.jumpTo}
          value={active}
          onChange={(e) => { setActive(e.target.value); goTo(e.target.value); }}
        >
          {content.sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      <article className="guide-body">
        <p className="guide-lede">{content.lede}</p>
        {content.sections.map((s) => (
          <section key={s.id} id={domId(s.id)} aria-labelledby={`${domId(s.id)}-title`} className="guide-section">
            <h2 id={`${domId(s.id)}-title`}>{s.title}</h2>
            {s.blocks.map((b, i) => <BlockView key={i} block={b} ui={content.ui} />)}
          </section>
        ))}
        <p className="guide-reference">
          <Inline text={content.reference.text} />{' '}
          <a href={content.reference.href} target="_blank" rel="noopener noreferrer">{content.reference.link}</a>
        </p>
      </article>
    </div>
  );
}
