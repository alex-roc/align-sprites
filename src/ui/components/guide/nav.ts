// Hash routing and scrolling inside the guide: `#/guide/<id>` where id is a section or a subsection (h3).
import { useEffect, useState } from 'react';

const PREFIX = '#/guide/';

export const domId = (id: string): string => `guide-${id}`;

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrollToId(id: string, smooth: boolean): boolean {
  const el = document.getElementById(domId(id));
  if (!el) return false;
  el.scrollIntoView({ behavior: smooth && !reducedMotion() ? 'smooth' : 'auto', block: 'start' });
  return true;
}

let handled: string | null = null;

/** True once if `goTo(id)` already scrolled there (so the hash change that follows does not jump again). */
export function consumeHandled(id: string): boolean {
  const was = handled === id;
  handled = null;
  return was;
}

/** Changes the hash (so the address can be shared and Back works) and scrolls there. */
export function goTo(id: string): void {
  const hash = PREFIX + id;
  if (window.location.hash !== hash) {
    handled = id;
    window.location.hash = hash;
  }
  scrollToId(id, true);
}

/** `#/guide/<id>` → id, otherwise null (links to other tabs or to the outside). */
export function guideIdOf(href: string): string | null {
  return href.startsWith(PREFIX) ? href.slice(PREFIX.length) : null;
}

/** The section whose heading last crossed the reading line, updated while scrolling. */
export function useActiveSection(ids: readonly string[]): [string, (id: string) => void] {
  const [active, setActive] = useState(ids[0] ?? '');
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = Math.min(180, window.innerHeight * 0.3);
      let current = ids[0] ?? '';
      for (const id of ids) {
        const el = document.getElementById(domId(id));
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ids]);
  return [active, setActive];
}
