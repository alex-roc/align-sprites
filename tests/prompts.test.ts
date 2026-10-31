import { describe, expect, it } from 'vitest';
import {
  buildSpritePrompt,
  buildTilePrompt,
  gridRows,
  makeGuideImage,
  suggestKey,
  type PromptOptions,
} from '../src/core/prompts/index.ts';
import type { RGBAImage } from '../src/core/types.ts';

function colors(img: RGBAImage): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < img.data.length; i += 4) {
    s.add(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]},${img.data[i + 3]}`);
  }
  return s;
}

const base: PromptOptions = {
  lang: 'en',
  mode: 'pixel',
  subject: 'a knight with a blue cape',
  action: 'walk',
  frames: 6,
  cols: 3,
  artHeight: 32,
  view: 'side',
  key: 'magenta',
  withReference: false,
};

describe('makeGuideImage', () => {
  it('has cols×cell by rows×cell and only key + guide shade (magenta)', () => {
    const img = makeGuideImage({ cols: 3, rows: 2, cell: 256, key: 'magenta' });
    expect(img.width).toBe(768);
    expect(img.height).toBe(512);
    expect([...colors(img)].sort()).toEqual(['224,0,224,255', '255,0,255,255']);
  });

  it('uses green shades for the green key and draws borders, baseline and numbers', () => {
    const cell = 128;
    const img = makeGuideImage({ cols: 4, rows: 1, cell, key: 'green', baseline: 0.9 });
    expect([...colors(img)].sort()).toEqual(['0,224,0,255', '0,255,0,255']);
    const px = (x: number, y: number) => img.data[(y * img.width + x) * 4 + 1];
    // Cell border at the left edge of cell 2, plain key in the middle of cell 1.
    expect(px(cell, 64)).toBe(224);
    expect(px(64, 64)).toBe(255);
    // Baseline at 90 % of the cell height, centred horizontally.
    expect(px(64, Math.round(cell * 0.9))).toBe(224);
    // Frame number "1" occupies some pixels in the top-left corner of cell 1.
    let ink = 0;
    for (let y = 2; y < 24; y++) for (let x = 2; x < 24; x++) if (px(x, y) === 224) ink++;
    expect(ink).toBeGreaterThan(0);
  });

  it('omits the baseline when baseline = 0', () => {
    const img = makeGuideImage({ cols: 1, rows: 1, cell: 128, key: 'magenta', baseline: 0 });
    const i = (Math.round(128 * 0.9) * 128 + 64) * 4;
    expect(img.data[i]).toBe(255);
  });
});

describe('buildSpritePrompt', () => {
  it('mentions frames, grid and exact key colour (en)', () => {
    const p = buildSpritePrompt(base);
    expect(p).toContain('6 frames');
    expect(p).toContain('3 columns × 2 rows');
    expect(p).toContain('#FF00FF');
    expect(p).toContain('32 art pixels');
    expect(p).toContain('Frame 6:');
    expect(p).not.toContain('Frame 7:');
    expect(p).toContain('side view');
    expect(p).not.toContain('reference');
  });

  it('mentions frames, grid and exact key colour (es)', () => {
    const p = buildSpritePrompt({ ...base, lang: 'es', key: 'green', mode: 'cartoon', withReference: true, cols: 4 });
    expect(p).toContain('6 cuadros');
    expect(p).toContain('4 columnas × 2 filas');
    expect(p).toContain('#00FF00');
    expect(p).toContain('Deja vacías las últimas 2 celdas');
    expect(p).toContain('referencia adjunta');
    expect(p).toContain('cartoon');
    expect(p).toContain('Cuadro 6:');
  });

  it('handles free-form actions, one-shot actions and single sprites', () => {
    expect(buildSpritePrompt({ ...base, action: 'dance', frames: 5, cols: 5 })).toContain('5 evenly timed key poses');
    const attack = buildSpritePrompt({ ...base, action: 'attack', frames: 3, cols: 3 });
    expect(attack).toContain('Frame 1: ready stance');
    expect(attack).toContain('Frame 3: recovery');
    expect(attack).not.toContain('loops');
    const one = buildSpritePrompt({ ...base, frames: 1, cols: 1, action: 'idle' });
    expect(one).toContain('ONE game sprite');
    expect(one).not.toContain('Frame 1');
  });

  it('lists key poses with in-betweens when frames exceed them', () => {
    const p = buildSpritePrompt({ ...base, action: 'idle', frames: 8, cols: 4 });
    expect(p).toContain('in-betweens');
  });
});

describe('buildTilePrompt', () => {
  it('asks for one seamless square texture in both languages', () => {
    const en = buildTilePrompt({ lang: 'en', mode: 'pixel', material: 'grass', tileSize: 32, view: 'top-down' });
    expect(en).toContain('seamless');
    expect(en).toContain('32×32 art pixels');
    expect(en).toContain('top-down');
    const es = buildTilePrompt({ lang: 'es', mode: 'cartoon', material: 'tierra', tileSize: 32, view: 'side' });
    expect(es).toContain('seamless');
    expect(es).toContain('ambos ejes');
    expect(es).not.toContain('32×32');
  });
});

describe('helpers', () => {
  it('gridRows and suggestKey', () => {
    expect(gridRows(6, 4)).toBe(2);
    expect(gridRows(6, 6)).toBe(1);
    expect(suggestKey('a pink slime')).toBe('green');
    expect(suggestKey('un dragón morado')).toBe('green');
    expect(suggestKey('a green slime')).toBe('magenta');
  });
});
