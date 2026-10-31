import { describe, expect, it } from 'vitest';
import { guideEn } from '../src/i18n/guide/en.ts';
import { guideEs } from '../src/i18n/guide/es.ts';
import { SECTION_IDS } from '../src/i18n/guide/types.ts';
import { COMPARE_ASSETS, HEIGHT_DEMO, IMAGE_SIZES } from '../src/ui/components/guide/assets.ts';

/** Fields that are not translated: they must be identical in both languages. */
const SAME = new Set(['type', 'id', 'tone', 'to', 'asset', 'src', 'lang', 'pixelated', 'zoom', 'backdrop']);

/** Walks both trees together and lists every structural difference (keys, list lengths, non-translatable values). */
function diff(a: unknown, b: unknown, path: string, out: string[]): void {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return void out.push(`${path}: array vs non-array`);
    if (a.length !== b.length) out.push(`${path}: length ${a.length} vs ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${path}[${i}]`, out);
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) out.push(`${path}: keys {${ka}} vs {${kb}}`);
    for (const k of ka) {
      if (!(k in b)) continue;
      const va = (a as Record<string, unknown>)[k];
      const vb = (b as Record<string, unknown>)[k];
      if (SAME.has(k) && va !== vb) out.push(`${path}.${k}: ${String(va)} vs ${String(vb)}`);
      else diff(va, vb, `${path}.${k}`, out);
    }
    return;
  }
  if (typeof a !== typeof b) out.push(`${path}: ${typeof a} vs ${typeof b}`);
}

/** Every string in a tree. */
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out));
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => strings(v, out));
  return out;
}

describe('guide content (en / es)', () => {
  it('es has exactly the structure of en', () => {
    const out: string[] = [];
    diff(guideEn, guideEs, 'guide', out);
    expect(out).toEqual([]);
  });

  it('has every section, in order, with a title and at least one block', () => {
    for (const g of [guideEn, guideEs]) {
      expect(g.sections.map((s) => s.id)).toEqual([...SECTION_IDS]);
      for (const s of g.sections) {
        expect(s.title.trim().length, s.id).toBeGreaterThan(0);
        expect(s.blocks.length, s.id).toBeGreaterThan(0);
      }
    }
  });

  it('subsection ids are unique and do not clash with section ids', () => {
    const ids = guideEn.sections.flatMap((s) => [s.id, ...s.blocks.flatMap((b) => (b.type === 'h3' ? [b.id] : []))]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no empty strings, and internal links point to an existing section or subsection', () => {
    const known = new Set(guideEn.sections.flatMap((s) => [s.id, ...s.blocks.flatMap((b) => (b.type === 'h3' ? [b.id] : []))]));
    for (const g of [guideEn, guideEs]) {
      for (const s of strings(g)) {
        expect(s.trim().length).toBeGreaterThan(0);
        for (const m of s.matchAll(/\]\(#\/guide\/([\w-]+)\)/g)) expect(known.has(m[1]!), m[1]).toBe(true);
      }
    }
  });

  it('keeps the voice rules: no middle dots, no emojis', () => {
    for (const g of [guideEn, guideEs]) {
      for (const s of strings(g)) {
        expect(s).not.toMatch(/·/);
        expect(s).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });

  it('every image of the guide exists in public/guide', async () => {
    const { existsSync } = await import('node:fs');
    const srcs = guideEn.sections.flatMap((s) =>
      s.blocks.flatMap((b) => (b.type === 'figures' ? b.items.map((i) => i.src) : b.type === 'example' ? [b.item.src] : [])),
    );
    const demo = [
      ...Object.values(COMPARE_ASSETS).flatMap((a) => [a.before, a.after]),
      ...Object.values(HEIGHT_DEMO).flatMap((m) => Object.values(m).map((c) => c.src)),
    ];
    for (const src of [...srcs, ...demo]) expect(existsSync(new URL('../public/' + src, import.meta.url)), src).toBe(true);
    // the sizes declared for the figures are the real ones (they reserve the space before the image loads)
    for (const src of srcs) expect(IMAGE_SIZES[src], src).toBeDefined();
  });
});
