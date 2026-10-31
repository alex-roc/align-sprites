import { describe, expect, it } from 'vitest';
import { crop, createImage, setPixel } from '../src/core/image.ts';
import {
  ALREADY_LOOPS, LOOP_WARN, bandFor, bestLoop, buildParallax, defaultFactors, findSeam, floatingArea, floatingCount, layerRoles, loopScore,
  makeLoop, parallaxExport, wantsCutout, type ParallaxInput,
} from '../src/core/parallax/index.ts';
import type { ExportTarget, RGBA8, RGBAImage } from '../src/core/types.ts';
import { rng } from './fixtures/synth.ts';
import { loadPng, loadUnfake } from './helpers.ts';

const core = loadUnfake();

const SKY: RGBA8 = [120, 180, 230, 255];
const PALETTE: RGBA8[] = [SKY, [40, 40, 70, 255], [70, 70, 110, 255], [200, 90, 60, 255]];

/**
 * Pixel-art skyline: sky + random buildings of 4 colours. With `margin` the first and last columns are sky, so it
 * repeats; without it the left and right edges are unrelated buildings, so it does not loop.
 */
function skyline(w: number, h: number, seed: number, margin = false): RGBAImage {
  const r = rng(seed);
  const img = createImage(w, h, SKY);
  const m = margin ? 4 : 0;
  for (let x = m; x < w - m; ) {
    const bw = 5 + Math.floor(r() * 8), bh = 8 + Math.floor(r() * (h - 14));
    const c = PALETTE[1 + Math.floor(r() * 3)]!;
    for (let dx = 0; dx < bw && x + dx < w - m; dx++) for (let y = h - bh; y < h; y++) setPixel(img, x + dx, y, c);
    x += bw + Math.floor(r() * 4);
  }
  return img;
}

const periodic = (w: number, h: number, seed: number): RGBAImage => skyline(w, h, seed, true);

/** Every pixel becomes k×k (what an AI image does to pixel art). */
function enlargeNearest(img: RGBAImage, k: number): RGBAImage {
  const out = createImage(img.width * k, img.height * k);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const si = (Math.floor(y / k) * img.width + Math.floor(x / k)) * 4;
      out.data.set(img.data.subarray(si, si + 4), (y * out.width + x) * 4);
    }
  }
  return out;
}

const colours = (img: RGBAImage): Set<number> => {
  const s = new Set<number>();
  for (let i = 0; i < img.data.length; i += 4) s.add((img.data[i] << 24) | (img.data[i + 1] << 16) | (img.data[i + 2] << 8) | img.data[i + 3]);
  return s;
};
const key = (c: RGBA8): number => (c[0] << 24) | (c[1] << 16) | (c[2] << 8) | c[3];

describe('loop: score and seam', () => {
  it('a layer that repeats scores ~1, a skyline with unrelated edges scores high', () => {
    expect(loopScore(periodic(240, 48, 3))).toBeLessThanOrEqual(ALREADY_LOOPS);
    expect(loopScore(skyline(240, 48, 3))).toBeGreaterThan(LOOP_WARN);
  });

  it('makeLoop shrinks the width by the band, lowers the score and keeps the source colours (no blur)', () => {
    const src = skyline(300, 48, 3);
    const band = bandFor(300, 0.15);
    const { image } = makeLoop(src, band);
    expect(image.width).toBe(300 - band);
    expect(image.height).toBe(48);
    expect(loopScore(image)).toBeLessThan(loopScore(src));
    expect(loopScore(image)).toBeLessThan(LOOP_WARN);
    const allowed = new Set(PALETTE.map(key));
    for (const c of colours(image)) expect(allowed.has(c)).toBe(true);
  });

  it('the last column is followed by the pixel that followed it in the source (the first output column)', () => {
    const src = skyline(300, 48, 9);
    const band = 40;
    const { image } = makeLoop(src, band);
    // Output column 0 is the tail column W-band (left of the seam) or the head column 0 (where tail and head agree).
    let bad = 0;
    for (let y = 0; y < 48; y++) {
      const o = (y * image.width) * 4;
      const tail = (y * 300 + 300 - band) * 4, head = (y * 300) * 4;
      const fromTail = [0, 1, 2, 3].every((k) => image.data[o + k] === src.data[tail + k]);
      const fromHead = [0, 1, 2, 3].every((k) => image.data[o + k] === src.data[head + k]);
      if (!fromTail && !fromHead) bad++;
    }
    expect(bad).toBe(0);
  });

  it('the seam avoids the expensive columns: identical tail and head give a cost-free path', () => {
    const w = 120, h = 30, band = 20;
    const img = skyline(w, h, 11);
    // Make the tail equal the head: any path is free, the result must then equal the source columns.
    for (let y = 0; y < h; y++) for (let x = 0; x < band; x++) img.data.set(img.data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4), (y * w + w - band + x) * 4);
    const seam = findSeam(img, band);
    expect(seam.length).toBe(h);
    for (let y = 1; y < h; y++) expect(Math.abs(seam[y]! - seam[y - 1]!)).toBeLessThanOrEqual(1);
    const { image } = makeLoop(img, band);
    expect(loopScore(image)).toBeLessThanOrEqual(ALREADY_LOOPS);
  });

  it('feather blends across the seam (cartoon) and still loops', () => {
    const src = skyline(300, 48, 5);
    const { image } = makeLoop(src, 45, 3);
    expect(loopScore(image)).toBeLessThan(loopScore(src));
  });

  it('transparent layers: two transparent pixels count as equal, sparse layers are not diluted', () => {
    const img = createImage(200, 40);
    for (let y = 30; y < 40; y++) for (let x = 0; x < 200; x++) setPixel(img, x, y, [60, 120, 40, 255]);
    expect(loopScore(img)).toBeLessThanOrEqual(ALREADY_LOOPS);
    for (let y = 10; y < 30; y++) for (let x = 190; x < 200; x++) setPixel(img, x, y, [90, 50, 20, 255]);
    expect(loopScore(img)).toBeGreaterThan(LOOP_WARN);
  });
});

describe('buildParallax', () => {
  const far = (): ParallaxInput => ({ image: skyline(480, 96, 21), removeBg: false, factor: 0.2 });
  const opts = { mode: 'pixel' as const, height: 48, loop: true, overlap: 0.12 };

  it('sets every layer to the game height, width from the aspect ratio minus the loop band (cartoon: free resample)', () => {
    const r = buildParallax(null, [far(), { image: skyline(240, 48, 4), removeBg: false, factor: 0.8 }], { ...opts, mode: 'cartoon' });
    expect(r.layers.map((l) => l.role)).toEqual(['far', 'near']);
    for (const l of r.layers) expect(l.image.height).toBe(48);
    const a = r.layers[0]!;
    expect(a.loop.applied).toBe(true);
    expect(a.image.width).toBe(Math.round((480 * 48) / 96) - a.loop.band);
    expect(a.loop.after).toBeLessThan(a.loop.before);
  });

  it('loop off keeps the full width; an already looping layer is left alone', () => {
    const off = buildParallax(null, [far()], { ...opts, mode: 'cartoon', loop: false });
    expect(off.layers[0]!.image.width).toBe(240);
    expect(off.layers[0]!.loop.applied).toBe(false);
    const p = buildParallax(null, [{ image: periodic(480, 96, 2), removeBg: false, factor: 0.2 }], { ...opts, mode: 'cartoon' });
    expect(p.layers[0]!.loop.alreadyLoops).toBe(true);
    expect(p.layers[0]!.image.width).toBe(240);
  });

  it('cartoon mode uses the area filter and keeps the height', () => {
    const r = buildParallax(null, [far()], { ...opts, mode: 'cartoon', height: 40 });
    expect(r.layers[0]!.image.height).toBe(40);
  });

  it('a fixed palette applies to every layer (pixel art)', () => {
    const pal: RGBA8[] = [[0, 0, 0, 255], [255, 255, 255, 255], [120, 180, 230, 255]];
    const r = buildParallax(core, [far()], { ...opts, palette: pal });
    const allowed = new Set(pal.map(key));
    for (const c of colours(r.layers[0]!.image)) expect(allowed.has(c)).toBe(true);
  });

  it('roles and default factors by layer count', () => {
    expect(layerRoles(3)).toEqual(['far', 'mid', 'near']);
    expect(layerRoles(4)).toEqual(['far', 'mid', 'near', 'front']);
    expect(defaultFactors(3)).toEqual([0.2, 0.5, 0.8]);
    expect(defaultFactors(2)).toEqual([0.2, 0.8]);
  });

  it('pixel art stays on its own grid: integer enlargement, game height matched at the top, bottom kept', () => {
    // 40 art px tall, enlarged x6 like an AI image; the game is 130 px high: k = round(130/40) = 3, 10 rows of padding.
    const art = (transparent: boolean) => {
      const img = skyline(100, 40, 31, false);
      if (transparent) for (let i = 0; i < img.data.length; i += 4) if (img.data[i] === SKY[0] && img.data[i + 1] === SKY[1]) img.data.fill(0, i, i + 4);
      return enlargeNearest(img, 6);
    };
    for (const transparent of [false, true]) {
      const r = buildParallax(core, [{ image: art(transparent), removeBg: false, factor: 0.5 }], { mode: 'pixel', height: 130, loop: false, overlap: 0.1 });
      const l = r.layers[0]!;
      expect(l.nativeHeight).toBe(40);
      expect(l.image.height).toBe(130);
      expect(l.image.width).toBe(300);
      expect(r.warnings).toEqual([]);
      // Rows 10..129 are the art at x3: every 3x3 block is one colour.
      const px = (x: number, y: number) => [0, 1, 2, 3].map((k) => l.image.data[(y * l.image.width + x) * 4 + k]).join();
      for (let y = 10; y < 130; y++) for (let x = 0; x < 300; x++) expect(px(x, y)).toBe(px(x - (x % 3), 10 + 3 * Math.floor((y - 10) / 3)));
      // The padding: an opaque layer repeats its top row (sky colour), a cut-out one is transparent.
      for (let y = 0; y < 10; y++) for (let x = 0; x < 300; x++) expect(px(x, y)).toBe(px(x, 10));
      expect(l.image.data[3]).toBe(transparent ? 0 : 255);
    }
  });

  it('warns only when the art cannot fit without losing a quarter of the height', () => {
    const img = enlargeNearest(skyline(100, 40, 31, false), 6);
    const r = buildParallax(core, [{ image: img, removeBg: false, factor: 0.5 }], { mode: 'pixel', height: 60, loop: false, overlap: 0.1 });
    // 40 x round(1.5) = 80 px for 60: 33 % cropped at the top.
    expect(r.warnings.map((w) => w.key)).toEqual(['warn.parallaxFit']);
    expect(r.layers[0]!.image.height).toBe(60);
  });

  it('wantsCutout: a chroma key along the TOP counts even when the ground touches the bottom edge', () => {
    const img = createImage(200, 100, [250, 3, 250, 255]);
    for (let y = 70; y < 100; y++) for (let x = 0; x < 200; x++) setPixel(img, x, y, [60, 120, 40, 255]);
    expect(wantsCutout(img, 1)).toBe(true);
    expect(wantsCutout(img, 0)).toBe(false);
    // An opaque landscape (a sky that varies along the top) is not cut.
    const sky = createImage(200, 100);
    for (let y = 0; y < 100; y++) for (let x = 0; x < 200; x++) setPixel(sky, x, y, [60 + x, 120 + (x >> 1), 200 - (x >> 1), 255]);
    expect(wantsCutout(sky, 1)).toBe(false);
    expect(wantsCutout(createImage(200, 100, [0, 0, 0, 0]), 1)).toBe(false);
  });

  it('real AI layers (gen2): auto cut, own grid, no warnings, no floating pieces added by the loop', () => {
    const far = loadPng('samples/codex/gen2/parallax-far-pixel.png');
    const near = loadPng('samples/codex/gen2/parallax-near-pixel.png');
    expect(wantsCutout(far, 0)).toBe(false);
    expect(wantsCutout(near, 1)).toBe(true);
    const run = (loop: boolean) => buildParallax(core, [
      { image: far, removeBg: false, factor: 0.2 },
      { image: near, removeBg: true, factor: 0.8 },
    ], { mode: 'pixel', height: 360, loop, overlap: 0.12 });
    const r = run(true);
    expect(r.warnings).toEqual([]);
    const [a, b] = r.layers;
    for (const l of r.layers) expect(l.image.height).toBe(360);
    // ~146-148 art px tall, enlarged x2 and padded at the top.
    expect(a!.nativeHeight).toBeGreaterThanOrEqual(140);
    expect(a!.nativeHeight).toBeLessThanOrEqual(150);
    expect(a!.image.data[3]).toBe(255);
    expect(b!.image.data[3]).toBe(0);
    // Every 2x2 block is one pixel (rows below the padding, bottom aligned).
    for (const l of r.layers) {
      const pad = 360 - 2 * l.nativeHeight!;
      for (let y = pad; y < 360; y += 2) {
        for (let x = 0; x < l.image.width; x += 2) {
          const i = (y * l.image.width + x) * 4, j = i + 4, k = i + l.image.width * 4;
          for (let c = 0; c < 4; c++) {
            expect(l.image.data[j + c]).toBe(l.image.data[i + c]);
            expect(l.image.data[k + c]).toBe(l.image.data[i + c]);
          }
        }
      }
    }
    // The magenta is gone and the loop made no new floating pieces.
    const flat = run(false).layers[1]!;
    expect(floatingArea(b!.image, true)).toBeLessThanOrEqual(floatingArea(flat.image, false));
    expect(b!.loop.after).toBeLessThan(1.8);
  });

  it('the old andes samples still process (loop on a crop that does not repeat)', () => {
    const farImg = loadPng('samples/parallax/andes-far-pixel.png');
    const nearImg = loadPng('samples/parallax/andes-near-pixel.png');
    const r = buildParallax(core, [
      { image: crop(farImg, { x: 100, y: 0, w: 1100, h: 1024 }), removeBg: false, factor: 0.2 },
      { image: crop(nearImg, { x: 300, y: 0, w: 1000, h: 1024 }), removeBg: true, factor: 0.8 },
    ], { mode: 'pixel', height: 180, loop: true, overlap: 0.12 });
    for (const l of r.layers) {
      expect(l.image.height).toBe(180);
      expect(l.loop.applied).toBe(true);
      expect(l.loop.after).toBeLessThan(l.loop.before);
      expect(l.loop.after).toBeLessThan(LOOP_WARN);
    }
    expect(r.layers[1]!.image.data[3]).toBe(0);
  });
});

describe('floating shapes', () => {
  /** Ground strip + a tree (trunk + crown) whose centre is at column `cx` (it wraps around the edges). */
  function treeLayer(w: number, h: number, cx: number): RGBAImage {
    const img = createImage(w, h);
    for (let y = h - 10; y < h; y++) for (let x = 0; x < w; x++) setPixel(img, x, y, [60, 90, 40, 255]);
    const put = (x: number, y: number, c: RGBA8) => setPixel(img, ((x % w) + w) % w, y, c);
    for (let y = h - 40; y < h - 10; y++) for (let x = cx - 4; x < cx + 4; x++) put(x, y, [100, 60, 30, 255]);
    for (let y = h - 52; y < h - 40; y++) for (let x = cx - 14; x < cx + 14; x++) put(x, y, [30, 120, 50, 255]);
    return img;
  }

  it('counts opaque shapes not connected to the bottom row; wrap joins the edges', () => {
    const img = createImage(40, 30);
    for (let y = 20; y < 30; y++) for (let x = 0; x < 40; x++) setPixel(img, x, y, [1, 2, 3, 255]);
    for (let y = 5; y < 10; y++) for (let x = 0; x < 6; x++) setPixel(img, x, y, [9, 9, 9, 255]); // touches the left edge
    for (let y = 5; y < 10; y++) for (let x = 36; x < 40; x++) setPixel(img, x, y, [9, 9, 9, 255]); // touches the right edge
    const sizes: number[] = [];
    expect(floatingCount(img, false, sizes)).toBe(2);
    expect(sizes.sort()).toEqual([20, 30]);
    expect(floatingCount(img, true)).toBe(1);
    expect(floatingCount(createImage(10, 10, [1, 2, 3, 255]))).toBe(0);
  });

  it('a tree wrapped across the edge is not split: the picture is kept as it is', () => {
    const img = treeLayer(200, 60, 0);
    const best = bestLoop(img, 0.12);
    expect(best.band).toBe(0);
    expect(best.newFloating).toBe(0);
    expect(floatingArea(best.image, true)).toBe(0);
  });

  it('a seam through a tree that is cut at the edge never leaves a floating piece', () => {
    // The crown at the right edge has no trunk (cut away); the left edge is plain ground.
    const img = treeLayer(200, 60, 100);
    for (let y = 60 - 52; y < 60 - 40; y++) for (let x = 186; x < 200; x++) setPixel(img, x, y, [30, 120, 50, 255]);
    const base = floatingArea(img, false);
    const best = bestLoop(img, 0.12);
    expect(floatingArea(best.image, true)).toBeLessThanOrEqual(Math.max(base, 0));
  });
});

describe('parallax exports', () => {
  const r = buildParallax(core, [
    { image: skyline(480, 96, 21), removeBg: false, factor: 0.2 },
    { image: skyline(480, 96, 22), removeBg: false, factor: 0.5 },
    { image: skyline(480, 96, 23), removeBg: false, factor: 0.8 },
  ], { mode: 'pixel', height: 48, loop: true, overlap: 0.12 });
  const text = (files: { path: string; data: Uint8Array | string }[], path: string): string => {
    const f = files.find((x) => x.path === path);
    if (!f) throw new Error(`missing ${path}: ${files.map((x) => x.path).join(', ')}`);
    return typeof f.data === 'string' ? f.data : new TextDecoder().decode(f.data);
  };

  it('every engine ships the layer PNGs with unique, ordered names', () => {
    for (const t of ['godot', 'gdevelop', 'kaplay', 'generic'] as ExportTarget[]) {
      const files = parallaxExport(r, 'Mi Fondo', [t]);
      const names = files.map((f) => f.path).filter((p) => p.endsWith('.png'));
      expect(names).toEqual(['mi_fondo/mi_fondo_0_far.png', 'mi_fondo/mi_fondo_1_mid.png', 'mi_fondo/mi_fondo_2_near.png']);
    }
  });

  it('several engines go in <engine>/ folders', () => {
    const files = parallaxExport(r, 'bg', ['godot', 'kaplay']);
    expect(files.every((f) => f.path.startsWith('godot/bg/') || f.path.startsWith('kaplay/bg/'))).toBe(true);
  });

  it('Godot: Parallax2D per layer with scroll_scale, repeat_size = width, Sprite2D not centred, nearest filter', () => {
    const t = text(parallaxExport(r, 'bg', ['godot']), 'bg/bg.tscn');
    expect(t).toContain('[gd_scene load_steps=4 format=3]');
    expect(t.match(/type="Parallax2D"/g)).toHaveLength(3);
    expect(t).toContain('scroll_scale = Vector2(0.2, 1)');
    expect(t).toContain('scroll_scale = Vector2(0.8, 1)');
    expect(t).toContain(`repeat_size = Vector2(${r.layers[0]!.image.width}, 0)`);
    expect(t).toContain('centered = false');
    expect(t).toContain('texture_filter = 1');
    expect(t).toContain('path="bg_0_far.png"');
    expect(t).not.toContain('uid=');
  });

  it('Godot: cartoon layers have no nearest filter', () => {
    const c = buildParallax(null, [{ image: skyline(240, 48, 4), removeBg: false, factor: 0.5 }], { mode: 'cartoon', height: 40, loop: true, overlap: 0.1 });
    expect(text(parallaxExport(c, 'bg', ['godot']), 'bg/bg.tscn')).not.toContain('texture_filter');
  });

  it('Kaplay: the snippet is valid JS and lists every layer with its factor and width', () => {
    const js = text(parallaxExport(r, 'bg', ['kaplay']), 'bg/bg.js');
    expect(() => new Function(js)).not.toThrow();
    expect(js).toContain('sprite: "bg_1_mid"');
    expect(js).toContain(`w: ${r.layers[1]!.image.width}`);
    expect(js).toContain('factor: 0.5');
    expect(js).toContain('crisp: true');
  });

  it('GDevelop: README names the extension and the factors', () => {
    const t = text(parallaxExport(r, 'bg', ['gdevelop']), 'bg/README.txt');
    expect(t).toContain('Parallax for Tiled Sprite');
    expect(t).toContain('parallax factor 0.5');
    expect(t).toContain('CameraX("")');
  });

  it('generic: JSON with file, size, factor and loopX', () => {
    const j = JSON.parse(text(parallaxExport(r, 'bg', ['generic']), 'bg/bg.json'));
    expect(j.height).toBe(48);
    expect(j.layers).toHaveLength(3);
    expect(j.layers[2]).toMatchObject({ file: 'bg_2_near.png', role: 'near', height: 48, factor: 0.8, loopX: true });
    expect(j.layers[2].width).toBe(r.layers[2]!.image.width);
  });
});
