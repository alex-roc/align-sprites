import { describe, expect, it } from 'vitest';
import {
  ASSET_PROMPT_DEFAULTS,
  ATLAS_GUTTER,
  EFFECT_KINDS,
  ITEMS_SAFE,
  PARALLAX_ASPECTS,
  PARALLAX_LAYERS,
  buildAtlasPrompt,
  buildDirectionsPrompt,
  buildEffectPrompt,
  buildItemsPrompt,
  buildParallaxPrompt,
  buildVideoPrompt,
  directionRows,
  makeParallaxGuide,
  makeSheetGuide,
} from '../src/core/prompts/assets.ts';
import type { Lang } from '../src/core/prompts/index.ts';
import type { RGBAImage } from '../src/core/types.ts';

const D = ASSET_PROMPT_DEFAULTS;
const LANGS: Lang[] = ['en', 'es'];

function colors(img: RGBAImage): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < img.data.length; i += 4) s.add(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`);
  return s;
}
const px = (img: RGBAImage, x: number, y: number) => img.data[(y * img.width + x) * 4 + 1];

describe('makeSheetGuide', () => {
  it('adds gutters around and between cells, only key + guide shade', () => {
    const cell = 128, gutter = 16;
    const img = makeSheetGuide({ cols: 3, rows: 2, cell, gutter, key: 'magenta' });
    expect(img.width).toBe(3 * cell + 4 * gutter);
    expect(img.height).toBe(2 * cell + 3 * gutter);
    expect([...colors(img)].sort()).toEqual(['224,0,224', '255,0,255']);
    // The gutter between cells 1 and 2 is plain key; the second cell starts with its border.
    expect(px(img, gutter + cell + 8, 64)).toBe(0);
    expect(img.data[((64) * img.width + gutter + cell + gutter) * 4]).toBe(224);
  });

  it('draws the centre cross, the safe square and the baseline when asked', () => {
    const cell = 128;
    const img = makeSheetGuide({ cols: 1, rows: 1, cell, key: 'green', cross: true, safe: ITEMS_SAFE, baseline: 0.9 });
    expect([...colors(img)].sort()).toEqual(['0,224,0', '0,255,0']);
    expect(px(img, 64, 64)).toBe(224); // cross centre
    expect(px(img, 64 + 5, 64 + 5)).toBe(255); // away from the arms
    const inset = Math.round((cell * (1 - ITEMS_SAFE)) / 2);
    expect(px(img, inset, 64)).toBe(224); // safe square border
    expect(px(img, 64, Math.round(cell * 0.9))).toBe(224);
    const plain = makeSheetGuide({ cols: 1, rows: 1, cell, key: 'green' });
    expect(px(plain, 64, 64)).toBe(255);
    expect(px(plain, 64, Math.round(cell * 0.9))).toBe(255);
  });

  it('draws a different arrow for each direction', () => {
    const cell = 256;
    const img = makeSheetGuide({ cols: 1, rows: 4, cell, key: 'magenta', arrows: directionRows(false) });
    // The arrow sits in the top-right corner of each cell: compare their pixel patterns.
    const red = (x: number, y: number) => img.data[(y * img.width + x) * 4];
    const pattern = (row: number) => {
      let s = '';
      for (let y = 8; y < 80; y += 4) for (let x = cell - 80; x < cell - 8; x += 4) s += red(x, row * cell + y) === 224 ? '#' : '.';
      return s;
    };
    expect(pattern(0)).toContain('#');
    const set = new Set([0, 1, 2, 3].map(pattern));
    expect(set.size).toBe(4);
  });
});

describe('makeParallaxGuide', () => {
  it('follows the aspect ratio and marks where mid/near content starts', () => {
    for (const a of PARALLAX_ASPECTS) {
      const img = makeParallaxGuide({ aspect: a, layer: 'far', key: 'magenta', width: 1200 });
      const [w, h] = a.split(':').map(Number);
      expect(img.width).toBe(1200);
      expect(img.height).toBe(Math.round(1200 / (w / h)));
    }
    const far = makeParallaxGuide({ aspect: '2:1', layer: 'far', key: 'magenta', width: 1024 });
    const mid = makeParallaxGuide({ aspect: '2:1', layer: 'mid', key: 'magenta', width: 1024 });
    const y = Math.round(512 * 0.4);
    const red = (img: RGBAImage, x: number, yy: number) => img.data[(yy * img.width + x) * 4];
    expect(red(far, 40, y)).toBe(255); // far: no content line
    expect(red(mid, 40, y)).toBe(224); // mid: inside the first dash
    const ink = (img: RGBAImage) => [...colors(img)].sort();
    expect(ink(far)).toEqual(['224,0,224', '255,0,255']);
  });

  it('puts matching ticks on both edges', () => {
    const img = makeParallaxGuide({ aspect: '16:9', layer: 'far', key: 'green', width: 1536 });
    const y = Math.round(img.height * 0.5);
    expect(img.data[(y * img.width + 10) * 4 + 1]).toBe(224);
    expect(img.data[(y * img.width + img.width - 10) * 4 + 1]).toBe(224);
  });
});

describe.each(LANGS)('prompts (%s)', (lang) => {
  const en = lang === 'en';

  it('atlas: grid, gaps, solid tops and key colour', () => {
    const p = buildAtlasPrompt({ ...D.atlas, lang, theme: 'Andean mountains', cols: 6, rows: 4, tileSize: 32 });
    expect(p).toContain('Andean mountains');
    expect(p).toContain(en ? '6 columns × 4 rows (24 square tiles)' : '6 columnas × 4 filas (24 tiles cuadrados)');
    expect(p).toContain(en ? 'SOLID TOPS' : 'SUPERFICIES SÓLIDAS');
    expect(p).toContain(en ? 'gap of plain background' : 'espacio de fondo liso');
    expect(p).toContain('32×32');
    expect(p).toContain('#FF00FF');
    expect(p).not.toContain(en ? 'Two images are attached' : 'Se adjuntan dos imágenes');
    expect(buildAtlasPrompt({ ...D.atlas, lang, theme: 'x', withReference: true, mode: 'cartoon' })).toContain(en ? 'style reference' : 'referencia de estilo');
    expect(buildAtlasPrompt({ ...D.atlas, lang, theme: 'x', view: 'top-down' })).not.toContain(en ? 'SOLID TOPS' : 'SUPERFICIES SÓLIDAS');
    expect(ATLAS_GUTTER).toBeGreaterThan(0);
  });

  it('directions: 4 rows in RPG order, or 3 rows that mirror the side view', () => {
    const four = buildDirectionsPrompt({ ...D.directions, lang, subject: 'a farmer', frames: 4 });
    expect(four).toContain(en ? '4 rows (one per direction) × 4 columns' : '4 filas (una por dirección) × 4 columnas');
    const order = (en ? ['Row 1: facing down', 'Row 2: facing left', 'Row 3: facing right', 'Row 4: facing up'] : ['Fila 1: mirando hacia abajo', 'Fila 2: mirando a la izquierda', 'Fila 3: mirando a la derecha', 'Fila 4: mirando hacia arriba']);
    const at = order.map((s) => four.indexOf(s));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(four).not.toContain(en ? 'mirrors the profile row' : 'refleja la fila de perfil');
    const three = buildDirectionsPrompt({ ...D.directions, lang, subject: 'a farmer', frames: 6, threeRows: true, withReference: true });
    expect(three).toContain(en ? '3 rows' : '3 filas');
    expect(three).not.toContain(en ? 'facing left' : 'a la izquierda (de perfil)');
    expect(three).toContain(en ? 'mirrors the profile row' : 'refleja la fila de perfil');
    expect(three).toContain(en ? 'in-betweens' : 'intermedios');
    expect(directionRows(false)).toEqual(['down', 'left', 'right', 'up']);
    expect(directionRows(true)).toEqual(['down', 'right', 'up']);
  });

  it('effects: every kind, centred, no glow, loop only for projectiles', () => {
    for (const kind of EFFECT_KINDS) {
      const p = buildEffectPrompt({ ...D.effects, lang, kind, description: 'orange fire', frames: 8, cols: 4 });
      expect(p).toContain(en ? '8 frames in a grid of 4 columns × 2 rows' : '8 cuadros en una cuadrícula de 4 columnas × 2 filas');
      expect(p).toContain(en ? 'cross' : 'cruz');
      expect(p).toContain(en ? 'No glow' : 'Sin resplandor');
      expect(p).toContain('orange fire');
      expect(p.includes(en ? 'flows smoothly back into frame 1' : 'enlaza suavemente con el cuadro 1')).toBe(kind === 'projectile');
    }
    expect(buildEffectPrompt({ ...D.effects, lang, mode: 'cartoon', frames: 7, cols: 4 })).toContain(en ? 'Leave the last cell empty' : 'Deja vacía la última celda');
  });

  it('items: grid, same scale, no shadows on the background', () => {
    const p = buildItemsPrompt({ ...D.items, lang, items: 'coin, potion, key', cols: 4, rows: 2 });
    expect(p).toContain(en ? '8 separate game items' : '8 objetos de juego');
    expect(p).toContain('coin, potion, key');
    expect(p).toContain(en ? 'inner square' : 'cuadrado interior');
    expect(p).toContain(en ? 'same scale' : 'misma escala');
    expect(p).toContain(en ? 'no drop shadow' : 'sin sombra proyectada');
    expect(p).toContain('#FF00FF');
  });

  it('parallax: far is opaque, mid and near sit on the key, all loop horizontally', () => {
    for (const layer of PARALLAX_LAYERS) {
      for (const aspect of PARALLAX_ASPECTS) {
        const p = buildParallaxPrompt({ ...D.parallax, lang, layer, aspect, theme: 'mountains' });
        expect(p).toContain(aspect);
        expect(p).toContain(en ? 'seamless' : 'Continua en horizontal');
        expect(p.includes('#FF00FF')).toBe(layer !== 'far');
      }
    }
    expect(buildParallaxPrompt({ ...D.parallax, lang, layer: 'far', theme: 'x' })).toContain(en ? 'fully opaque' : 'totalmente opaca');
    const near = buildParallaxPrompt({ ...D.parallax, lang, layer: 'near', theme: 'x', withReference: true, key: 'green' });
    expect(near).toContain('#00FF00');
    expect(near).toContain(en ? 'the layer already made' : 'la capa ya hecha');
    expect(buildParallaxPrompt({ ...D.parallax, lang, layer: 'mid', theme: 'x' })).not.toContain(en ? 'already made' : 'ya hecha');
  });

  it('video: in place, static camera, loop, green screen, optional first frame', () => {
    const p = buildVideoPrompt({ ...D.video, lang, subject: 'a knight', action: 'run', seconds: 3 });
    expect(p).toContain('a knight');
    expect(p).toContain(en ? '3-second' : '3 segundos');
    expect(p).toContain(en ? 'Completely static camera' : 'Cámara totalmente fija');
    expect(p).toContain(en ? 'starts and ends in the same pose' : 'empieza y termina en la misma pose');
    expect(p).toContain('#00FF00');
    expect(p).toContain(en ? 'attached image is the first frame' : 'imagen adjunta es el primer cuadro');
    const text = buildVideoPrompt({ ...D.video, lang, subject: 'a knight', action: 'run', seconds: 9, withFirstFrame: false, key: 'magenta', mode: 'pixel' });
    expect(text).not.toContain(en ? 'first frame' : 'primer cuadro');
    expect(text).toContain(en ? '4-second' : '4 segundos'); // clamped to 2-4 s
    expect(text).toContain('#FF00FF');
    expect(text).toContain('pixel art');
  });
});
