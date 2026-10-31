import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { es } from '../src/i18n/es.ts';
import { interpolate, pickLang } from '../src/i18n/translate.ts';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  it('es has exactly the keys of en', () => {
    const e = Object.keys(en).sort();
    const s = Object.keys(es).sort();
    expect(s.filter((k) => !e.includes(k))).toEqual([]);
    expect(e.filter((k) => !s.includes(k))).toEqual([]);
  });

  it('no empty messages', () => {
    for (const [k, v] of [...Object.entries(en), ...Object.entries(es)]) expect(v.trim().length, k).toBeGreaterThan(0);
  });

  it('both languages use the same {placeholders} per key', () => {
    const table = es as Record<string, string>;
    for (const [k, v] of Object.entries(en)) expect(placeholders(table[k]), k).toEqual(placeholders(v));
  });

  it('has the warn.* keys emitted by the core', () => {
    for (const k of ['clipped', 'frameCount', 'animRange', 'noFrames', 'noGrid', 'bigDownscale', 'upscale', 'lowBgConfidence', 'cellTooSmall', 'tileGridUncertain', 'tileUpscaled', 'notSeamless', 'edgeStyleClamped', 'dualOddTile']) {
      expect(en, k).toHaveProperty(`warn.${k}`);
      expect(es, k).toHaveProperty(`warn.${k}`);
    }
  });

  it('interpolates params and leaves unknown ones untouched', () => {
    expect(interpolate('Frame {frame} lost {px} px', { frame: 3, px: 2 })).toBe('Frame 3 lost 2 px');
    expect(interpolate('a {x} b', {})).toBe('a {x} b');
    expect(interpolate('plain')).toBe('plain');
  });

  it('picks the first supported browser language, defaulting to en', () => {
    expect(pickLang(['fr-FR', 'es-CL', 'en'])).toBe('es');
    expect(pickLang(['en-US', 'es'])).toBe('en');
    expect(pickLang(['de', 'fr'])).toBe('en');
    expect(pickLang([])).toBe('en');
  });
});
