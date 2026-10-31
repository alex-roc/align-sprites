// Helpers shared by the exporters.
import type { PackedAnim, PackedSheet, RGBAImage, SpriteResult } from '../types.ts';
import { encodePng } from './png.ts';

/** Safe ASCII file/folder name: [a-z0-9_-], never empty. */
export function slug(name: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'sprite';
}

/** Anim slugs, made unique (`idle`, `idle_2`...) so file/animation names never collide. */
export function animSlugs(anims: PackedAnim[]): string[] {
  const seen = new Map<string, number>();
  return anims.map((a) => {
    const base = slug(a.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
}

/** A sheet with exactly one animation of one frame is a static sprite: exporters skip animation machinery. */
export function isStatic(sheet: PackedSheet): boolean {
  return sheet.anims.length === 1 && sheet.anims[0]!.count === 1;
}

/** Origin at the feet: x = floor(w/2), y = h-1-padBottom (cell px). */
export function feetOrigin(sheet: PackedSheet): { x: number; y: number } {
  return { x: Math.floor(sheet.cell.w / 2), y: sheet.cell.h - 1 - sheet.padBottom };
}

/** Centred sprites (effects, projectiles): the origin is the middle of the cell. */
export function isCenter(sheet: PackedSheet): boolean {
  return sheet.anchor === 'center';
}

/** Origin at the centre: (w/2, h/2) in cell px (continuous coordinates, so fractional for an odd size). */
export function centerOrigin(sheet: PackedSheet): { x: number; y: number } {
  return { x: sheet.cell.w / 2, y: sheet.cell.h / 2 };
}

/** Origin of the sprite as the exporters place it: the feet (default) or the centre, in cell px. */
export function sheetOrigin(sheet: PackedSheet): { x: number; y: number } {
  return isCenter(sheet) ? centerOrigin(sheet) : feetOrigin(sheet);
}

/** Round to at most 2 decimals (a collision box of a centred sprite can sit on half pixels). */
export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Cell rect (sheet px) of frame `i` of the animation placed on `row`. */
export function frameRect(sheet: PackedSheet, row: number, i: number): { x: number; y: number; w: number; h: number } {
  return { x: i * sheet.cell.w, y: row * sheet.cell.h, w: sheet.cell.w, h: sheet.cell.h };
}

/** Cell-sized crop of the sheet image (used when SpriteResult.frames is not available). */
export function cropCell(img: RGBAImage, x: number, y: number, w: number, h: number): RGBAImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let r = 0; r < h; r++) {
    const src = ((y + r) * img.width + x) * 4;
    data.set(img.data.subarray(src, src + w * 4), r * w * 4);
  }
  return { width: w, height: h, data };
}

/** Per-animation frame images: taken from the sheet so they always match the exported PNG. */
export function animFrames(r: SpriteResult): RGBAImage[][] {
  const { sheet } = r;
  return sheet.anims.map((a) => {
    const out: RGBAImage[] = [];
    for (let i = 0; i < a.count; i++) {
      const rc = frameRect(sheet, a.row, i);
      out.push(cropCell(sheet.image, rc.x, rc.y, rc.w, rc.h));
    }
    return out;
  });
}

export function sheetPng(r: SpriteResult): Uint8Array {
  return encodePng(r.sheet.image);
}

/** Round to at most 4 decimals and keep a decimal point (Godot float literals). */
export function fl(n: number): string {
  const s = String(Math.round(n * 10000) / 10000);
  return /[.e]/.test(s) ? s : `${s}.0`;
}
